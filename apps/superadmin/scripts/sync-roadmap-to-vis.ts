#!/usr/bin/env npx ts-node
/**
 * sync-roadmap-to-vis.ts
 *
 * Bulk-migrates RAW_FEATURES from roadmap.ts to Paperclip VIS.
 *
 * Usage:
 *   npx ts-node scripts/sync-roadmap-to-vis.ts --dry-run
 *   npx ts-node scripts/sync-roadmap-to-vis.ts --mode batch
 *   npx ts-node scripts/sync-roadmap-to-vis.ts --mode incremental
 *
 * Required env vars (from .env.local):
 *   NEXT_PUBLIC_PAPERCLIP_BASE_URL
 *   NEXT_PUBLIC_PAPERCLIP_COMPANY_ID
 *   PAPERCLIP_API_KEY  (server-side long-lived key)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Load .env.local from superadmin root
function loadEnv(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

const scriptDir = __dirname;
const superadminRoot = path.resolve(scriptDir, '..');
loadEnv(path.join(superadminRoot, '.env.local'));
loadEnv(path.join(superadminRoot, '../../.env.local'));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ROADMAP_DATA } = require('../app/data/roadmap') as {
  ROADMAP_DATA: import('../app/data/roadmap').RoadmapData;
};
import type { RoadmapFeature, PhaseType } from '../app/data/roadmap';

// ── Types ────────────────────────────────────────────────────────────────────

type SyncMode = 'batch' | 'incremental';
type IssuePriority = 'low' | 'medium' | 'high' | 'urgent';

interface IssuePayload {
  title: string;
  description: string;
  status: 'todo';
  priority: IssuePriority;
  projectId?: string;
  goalId?: string;
}

interface SyncResult {
  featureName: string;
  visIssueId?: string;    // human-readable e.g. "VIS-42"
  visIssueKey?: string;   // internal UUID
  skipped: boolean;
  error?: string;
}

interface SyncReport {
  timestamp: string;
  mode: SyncMode | 'dry-run';
  total: number;
  success: number;
  skipped: number;
  failed: number;
  results: SyncResult[];
}

// ── Mapping helpers ──────────────────────────────────────────────────────────

function derivePriority(f: RoadmapFeature): IssuePriority {
  if (f.deployStatus === 'production' || f.phase === 'operations') return 'urgent';
  if (f.phase === 'testing') return 'high';
  if ((f.phase ?? 'development') === 'development') {
    return (f.percentage ?? 0) >= 50 ? 'medium' : 'low';
  }
  return 'medium';
}

function buildDescription(f: RoadmapFeature): string {
  const lines: string[] = [];
  if (f.acceptanceCriteria) {
    lines.push('## Acceptance Criteria', '', f.acceptanceCriteria, '');
  }
  if (f.featureSpecDocPath) {
    lines.push(`**Feature Spec**: [${f.featureSpecDocPath}](${f.featureSpecDocPath})`, '');
  }
  if (f.locatedPage) {
    lines.push(`**Located page**: \`${f.locatedPage}\``, '');
  }
  lines.push(`**Category**: ${f.category}`);
  lines.push(`**Phase**: ${f.phase ?? 'development'}`);
  lines.push(`**Progress**: ${f.percentage ?? 0}%`);
  if (f.points) lines.push(`**Story points**: ${f.points}`);
  return lines.join('\n').trim();
}

function buildPayload(f: RoadmapFeature): IssuePayload {
  const title = `[${f.category}] ${f.name}`.slice(0, 200);
  return {
    title,
    description: buildDescription(f),
    status: 'todo',
    priority: derivePriority(f),
  };
}

// ── Rate limiting ────────────────────────────────────────────────────────────

const RATE_LIMIT_DELAY_MS = 200; // 5 req/s

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  label = 'request',
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRateLimit =
        lastError.message.includes('429') || lastError.message.toLowerCase().includes('rate');
      const delayMs = isRateLimit ? 60_000 : Math.pow(2, attempt) * 1000;
      if (attempt < maxAttempts) {
        console.warn(`  ⚠ ${label} attempt ${attempt} failed: ${lastError.message} — retrying in ${delayMs / 1000}s`);
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

// ── Paperclip API ────────────────────────────────────────────────────────────

interface CreatedIssue {
  id: string;
  identifier?: string;
  issueKey?: string;
}

async function createVISIssue(
  baseUrl: string,
  companyId: string,
  apiKey: string,
  payload: IssuePayload,
): Promise<CreatedIssue> {
  const resp = await withRetry(async () => {
    const r = await fetch(`${baseUrl}/api/companies/${companyId}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`HTTP ${r.status}: ${body.slice(0, 200)}`);
    }
    return r;
  }, 3, `POST issue "${payload.title.slice(0, 40)}"`);

  const body = (await resp.json()) as Record<string, unknown>;
  return {
    id: String(body.id ?? ''),
    identifier: typeof body.identifier === 'string' ? body.identifier : undefined,
    issueKey: typeof body.issueKey === 'string' ? body.issueKey : undefined,
  };
}

// ── Roadmap write-back ────────────────────────────────────────────────────────

function writeBackRoadmap(results: SyncResult[]): void {
  const roadmapPath = path.join(superadminRoot, 'app/data/roadmap.ts');
  let src = fs.readFileSync(roadmapPath, 'utf-8');

  let patched = 0;
  for (const r of results) {
    if (r.skipped || r.error || !r.visIssueId || !r.visIssueKey) continue;

    // Find the name field inside the feature object and append VIS fields nearby.
    // Strategy: locate `name: "<featureName>",` and inject vis fields after the `name:` line.
    const escapedName = r.featureName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePattern = new RegExp(
      `(name:\\s*["'\`]${escapedName}["'\`]\\s*,)`,
      'g',
    );

    // We need to add vis fields to the object — check if they already exist first.
    if (src.includes(`vis_issue_id: "${r.visIssueId}"`)) continue;

    const visFields = [
      `    vis_issue_id: "${r.visIssueId}",`,
      `    vis_issue_key: "${r.visIssueKey}",`,
      `    vis_sync_status: "in_sync",`,
      `    vis_last_synced_at: "${new Date().toISOString()}",`,
    ].join('\n');

    src = src.replace(namePattern, `$1\n${visFields}`);
    patched++;
  }

  if (patched > 0) {
    fs.writeFileSync(roadmapPath, src, 'utf-8');
    console.log(`\n✅ roadmap.ts write-back: ${patched} feature(s) updated.`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const modeArg = args.find(a => a.startsWith('--mode=')) ?? args[args.indexOf('--mode') + 1];
  const mode: SyncMode = modeArg === 'incremental' ? 'incremental' : 'batch';

  const baseUrl = (process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL ?? 'http://localhost:3187').replace(/\/$/, '');
  const companyId = process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY_ID ?? '';
  const apiKey = process.env.PAPERCLIP_API_KEY ?? process.env.PAPERCLIP_ADMIN_API_KEY ?? '';

  if (!dryRun && (!baseUrl || !companyId || !apiKey)) {
    console.error('❌ Missing required env vars: NEXT_PUBLIC_PAPERCLIP_BASE_URL, NEXT_PUBLIC_PAPERCLIP_COMPANY_ID, PAPERCLIP_API_KEY');
    process.exit(1);
  }

  const features: RoadmapFeature[] = ROADMAP_DATA.features;
  const toSync = mode === 'incremental'
    ? features.filter(f => !f.vis_issue_id)
    : features;

  console.log(`\n🚀 sync-roadmap-to-vis`);
  console.log(`   Mode   : ${dryRun ? 'dry-run' : mode}`);
  console.log(`   Total  : ${features.length} features`);
  console.log(`   ToSync : ${toSync.length} features\n`);

  const results: SyncResult[] = [];
  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < toSync.length; i++) {
    const f = toSync[i];

    // Skip already-synced in batch mode for idempotency
    if (mode === 'batch' && f.vis_issue_id) {
      console.log(`  [${String(i + 1).padStart(3, '0')}/${toSync.length}] ⏭  ${f.name} (already synced: ${f.vis_issue_id})`);
      results.push({ featureName: f.name, visIssueId: f.vis_issue_id, visIssueKey: f.vis_issue_key, skipped: true });
      skippedCount++;
      continue;
    }

    const payload = buildPayload(f);

    if (dryRun) {
      console.log(`  [${String(i + 1).padStart(3, '0')}/${toSync.length}] 📋 ${payload.title}`);
      console.log(`         priority=${payload.priority} phase=${f.phase ?? 'development'} progress=${f.percentage}%`);
      results.push({ featureName: f.name, skipped: false });
      continue;
    }

    try {
      const created = await createVISIssue(baseUrl, companyId, apiKey, payload);
      const visId = created.identifier ?? created.issueKey ?? created.id;
      console.log(`  [${String(i + 1).padStart(3, '0')}/${toSync.length}] ✅ ${visId} — ${f.name}`);
      results.push({ featureName: f.name, visIssueId: visId, visIssueKey: created.id, skipped: false });
      successCount++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`  [${String(i + 1).padStart(3, '0')}/${toSync.length}] ❌ ${f.name}: ${errMsg}`);
      results.push({ featureName: f.name, skipped: false, error: errMsg });
      failedCount++;
    }

    // Rate limit: 5 req/s
    await sleep(RATE_LIMIT_DELAY_MS);
  }

  // Write back vis_issue_id to roadmap.ts
  if (!dryRun && successCount > 0) {
    writeBackRoadmap(results);
  }

  // Write report
  const report: SyncReport = {
    timestamp: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : mode,
    total: toSync.length,
    success: successCount,
    skipped: skippedCount,
    failed: failedCount,
    results,
  };

  const reportDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const reportPath = `/tmp/sync-roadmap-to-vis-${reportDate}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\n📊 Summary`);
  console.log(`   Success : ${successCount}`);
  console.log(`   Skipped : ${skippedCount}`);
  console.log(`   Failed  : ${failedCount}`);
  console.log(`   Report  : ${reportPath}\n`);

  if (failedCount > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
