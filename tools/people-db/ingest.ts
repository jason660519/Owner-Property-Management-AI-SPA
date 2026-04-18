#!/usr/bin/env -S npx tsx
// Row 145 Sprint 6 — Ingestion orchestrator CLI.
//
// One entry point to the four stage CLIs. Inserts one row into
// public.people_db_ingest_runs per stage so the Sprint 6 monitoring
// dashboard can render a timeline.
//
// Usage:
//   npx tsx tools/people-db/ingest.ts --stage=all                 # scan → parse → normalize → resolve
//   npx tsx tools/people-db/ingest.ts --stage=scan                # single stage
//   npx tsx tools/people-db/ingest.ts --stage=parse --limit 100
//   npx tsx tools/people-db/ingest.ts --stage=all --dry-run
//
// Env:
//   SUPABASE_URL                default http://localhost:54321
//   SUPABASE_SERVICE_ROLE_KEY   required unless --dry-run
//
// Signals:
//   Ctrl-C (SIGINT) kills the running child and flips its ingest_runs
//   row to status='interrupted' before exit.

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { parseArgs } from 'node:util';

import { createClient } from '@supabase/supabase-js';

import {
  runOrchestrator,
  type IngestStage,
  type OrchestratorOpts,
} from '../../apps/superadmin/lib/people-db/ingest-orchestrator';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const { values } = parseArgs({
  options: {
    stage: { type: 'string', default: 'all' },
    limit: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const VALID_STAGES: ReadonlyArray<IngestStage | 'all'> = [
  'scan',
  'parse',
  'normalize',
  'resolve',
  'all',
];

const stageArg = values.stage as string;
if (!VALID_STAGES.includes(stageArg as IngestStage | 'all')) {
  console.error(
    `--stage must be one of ${VALID_STAGES.join(', ')} (got "${stageArg}")`,
  );
  process.exit(1);
}

const limit = values.limit ? Number(values.limit) : undefined;
if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
  console.error('--limit must be a positive integer');
  process.exit(1);
}

const opts: OrchestratorOpts = {
  stage: stageArg as IngestStage | 'all',
  limit,
  dryRun: Boolean(values['dry-run']),
};

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://localhost:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// SIGINT → AbortController
// ---------------------------------------------------------------------------

const ac = new AbortController();
process.on('SIGINT', () => {
  console.warn('\n[ingest] SIGINT received — interrupting current stage');
  ac.abort();
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const scriptDir = path.resolve(__dirname);

async function main(): Promise<void> {
  console.log(
    `[ingest] stage=${opts.stage}${opts.limit ? ` limit=${opts.limit}` : ''}${opts.dryRun ? ' (dry run)' : ''}`,
  );
  const startedAt = Date.now();

  const outcomes = await runOrchestrator(
    {
      supabase,
      spawn,
      scriptDir,
      signal: ac.signal,
    },
    opts,
  );

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n[ingest] done in ${seconds}s`);
  for (const o of outcomes) {
    const badge = o.status === 'succeeded' ? 'OK' : o.status.toUpperCase();
    console.log(`  ${badge.padEnd(11)} ${o.stage}${o.notes ? `  (${o.notes})` : ''}`);
  }

  // Exit non-zero if any stage failed or was interrupted; lets CI /
  // systemd notice even without reading ingest_runs.
  const allGood = outcomes.every((o) => o.status === 'succeeded');
  process.exit(allGood ? 0 : 1);
}

main().catch((err) => {
  console.error('[ingest] FATAL:', err);
  process.exit(1);
});
