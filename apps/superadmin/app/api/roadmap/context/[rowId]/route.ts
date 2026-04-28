// GET /api/roadmap/context/[rowId]
//
// Assembles the full dispatch context for a roadmap row. This is the
// server-side feed for the new row-context-aware dispatch prompt.
//
// The prompt template in prompt-templates.ts stays pure/sync. Anything that
// requires I/O (reading dev-log .md files, fetching a Paperclip run-log) lives
// here. The frontend calls this route, receives a JSON snapshot, then passes
// it into the sync prompt builder.
//
// Context priority (highest freshness first):
//   1. devLog inline — last timestamped segment (source of truth for "where
//      are we now")
//   2. devLogDocPath — full dev log MD file (read when path is safe)
//   3. developmentProgress — single-line current snapshot
//   4. testLog / testLogDocPath — testing phase handoff
//   5. lastRunFailure — ONLY attached when the latest Paperclip run failed
//      (success runs carry no handoff signal worth the context budget)
//   6. featureSpecDocPath / tddSpecDocPath — design-era specs (unchanged)
//   7. phase + percentage — coarse signal, lowest priority

import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  findRoadmapFeatureById,
  normalizeRoadmapFeatureId,
  type RoadmapFeature,
} from '@/app/data/roadmap';
import {
  resolveDevLogDocPath,
  resolveUnitTestFolder,
  resolveE2EFolder,
} from '@/app/superadmin/dashboard/project-progress/components/development-table/types';
import { getAgentRuntime } from '@/lib/agent-runtime';

// -- Types returned to callers ---------------------------------------------

export interface RunFailureSnapshot {
  runStatus: string;
  exitCode?: number;
  finishedAt?: string;
  /** Trailing portion of stderr — capped so a huge log doesn't bloat prompts. */
  stderrTail?: string;
}

export interface RoadmapContextSnapshot {
  rowId: string;
  name: string;
  category: string;
  locatedPage?: string;
  percentage: number;
  phase: string;
  acceptanceCriteria?: string;

  /** Most recent `[YYYY/MM/DD] (agent, ...)` segment parsed out of devLog. */
  latestDevLogSegment?: string;
  /** Full inline devLog string — may contain multiple timestamped sections. */
  devLog?: string;
  /** Full contents of the .md file at devLogDocPath when readable. */
  devLogDocContent?: string;
  /** Resolved devLogDocPath (exposed so callers can display a link). */
  devLogDocPath?: string;

  developmentProgress?: string;

  testLog?: string;
  testLogDocPath?: string;

  featureSpecDocPath?: string;
  tddSpecDocPath?: string;

  unitFolder: string;
  e2eFolder: string;

  /** VIS linkage — present when the row has ever been dispatched. */
  visIssueId?: string;
  visIssueKey?: string;

  /** Attached only when the latest Paperclip run failed. */
  lastRunFailure?: RunFailureSnapshot;
}

export type RoadmapContextResult =
  | { ok: true; snapshot: RoadmapContextSnapshot }
  | { ok: false; status: number; error: string };

// -- Helpers ----------------------------------------------------------------

const DEV_LOG_ALLOWED_PREFIXES = ['project-process/', 'docs/'] as const;
const STDERR_TAIL_BYTES = 2000;
/** Hard cap on dev-log .md file size we'll inline into the snapshot. */
const MAX_DEV_LOG_BYTES = 40_000;

/**
 * Walk up from startDir looking for a marker that identifies the monorepo
 * root. The Next dev server sets process.cwd() to apps/superadmin, but
 * project-process/ and docs/ live at the monorepo root two levels up.
 * Returns startDir itself on failure so we still try to read — defensive
 * path guards below will still block anything outside the expected prefixes.
 */
async function findMonorepoRoot(startDir: string): Promise<string> {
  let current = path.resolve(startDir);
  for (let i = 0; i < 6; i += 1) {
    try {
      const marker = await fs.stat(path.join(current, 'project-process'));
      if (marker.isDirectory()) return current;
    } catch {
      // not this level — keep walking up
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return startDir;
}

let cachedMonorepoRoot: string | null = null;
async function getMonorepoRoot(): Promise<string> {
  if (cachedMonorepoRoot) return cachedMonorepoRoot;
  cachedMonorepoRoot = await findMonorepoRoot(process.cwd());
  return cachedMonorepoRoot;
}

/**
 * Extract the last `[YYYY/MM/DD]` timestamped section from an inline devLog.
 * The devLog convention in this repo is:
 *   [2026/02/13] (Author)
 *   • bullet
 *   [2026/04/11] (Author, VIS-12)
 *   • bullet
 * — segments are appended, never replaced. We surface the tail so the
 * receiving agent sees the most recent handoff first.
 */
export function parseLatestDevLogSegment(devLog: string | undefined): string | undefined {
  if (!devLog) return undefined;
  const matches = [...devLog.matchAll(/\[\d{4}\/\d{2}\/\d{2}\][^\[]*/g)];
  if (matches.length === 0) return undefined;
  return matches[matches.length - 1][0].trim();
}

function isWithinAllowedPrefix(p: string): boolean {
  return DEV_LOG_ALLOWED_PREFIXES.some((prefix) => p.startsWith(prefix));
}

async function readDevLogDoc(
  repoRoot: string,
  relativePath: string,
): Promise<string | undefined> {
  // Defensive path discipline: reject absolute paths, .. traversal, and any
  // path not under project-process/ or docs/. repoRoot is already trusted
  // (process.cwd() of the Next server), so the final resolve must land inside
  // one of the allowed subtrees.
  if (!isWithinAllowedPrefix(relativePath)) return undefined;
  if (relativePath.includes('..')) return undefined;

  const absPath = path.resolve(repoRoot, relativePath);
  if (!absPath.startsWith(repoRoot + path.sep)) return undefined;

  try {
    const stat = await fs.stat(absPath);
    if (!stat.isFile()) return undefined;
    if (stat.size > MAX_DEV_LOG_BYTES) {
      // Tail: read the last MAX_DEV_LOG_BYTES worth so the newest entries win.
      const fh = await fs.open(absPath, 'r');
      try {
        const buffer = Buffer.alloc(MAX_DEV_LOG_BYTES);
        await fh.read(buffer, 0, MAX_DEV_LOG_BYTES, stat.size - MAX_DEV_LOG_BYTES);
        return '…(truncated head)…\n' + buffer.toString('utf8');
      } finally {
        await fh.close();
      }
    }
    return await fs.readFile(absPath, 'utf8');
  } catch {
    return undefined;
  }
}

/**
 * Fetch the latest run snapshot from the runtime. Returns a compact failure
 * record only when the run actually failed — a succeeded/running snapshot
 * carries no useful handoff signal and would just cost prompt budget.
 */
async function loadLastRunFailure(
  visIssueKey: string,
): Promise<RunFailureSnapshot | undefined> {
  const runtimeResult = getAgentRuntime();
  if (!runtimeResult.ok) return undefined;

  const logResult = await runtimeResult.runtime.fetchIssueRunLog({
    issueId: visIssueKey,
  });
  if (!logResult.ok) return undefined;

  const snap = logResult.snapshot;
  const status = snap.runStatus;
  const failed =
    status === 'failed' ||
    status === 'errored' ||
    (typeof snap.exitCode === 'number' && snap.exitCode !== 0);

  if (!failed || !status) return undefined;

  const stderrTail = snap.stderrExcerpt?.slice(-STDERR_TAIL_BYTES);
  return {
    runStatus: status,
    exitCode: snap.exitCode,
    finishedAt: snap.finishedAt,
    stderrTail,
  };
}

// -- Route ------------------------------------------------------------------

function resolveFeatureById(rowId: string): {
  feature: RoadmapFeature;
  resolvedId: string;
} | null {
  const resolvedId = normalizeRoadmapFeatureId(rowId);
  const feature = findRoadmapFeatureById(resolvedId);
  if (!feature) return null;
  return { feature, resolvedId };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ rowId: string }> },
) {
  const { rowId: rawRowId } = await params;
  const rowId = normalizeRoadmapFeatureId(rawRowId ?? '');

  if (!rowId) {
    return NextResponse.json(
      {
        ok: false,
        status: 400,
        error: 'feature ID path parameter is required.',
      } satisfies RoadmapContextResult,
      { status: 400 },
    );
  }

  const hit = resolveFeatureById(rowId);
  if (!hit) {
    return NextResponse.json(
      {
        ok: false,
        status: 404,
        error: `Roadmap feature ID ${rowId} not found. Custom rows (client-side only) are not yet supported by this route.`,
      } satisfies RoadmapContextResult,
      { status: 404 },
    );
  }
  const { feature, resolvedId } = hit;

  const repoRoot = await getMonorepoRoot();
  const devLogDocPath = resolveDevLogDocPath(feature, resolvedId);
  const devLogDocContent = devLogDocPath
    ? await readDevLogDoc(repoRoot, devLogDocPath)
    : undefined;

  const latestDevLogSegment = parseLatestDevLogSegment(feature.devLog);

  // VIS run-log: only fetch when we have a key to point at. Failed-only guard
  // lives in loadLastRunFailure so it can short-circuit without any work.
  let lastRunFailure: RunFailureSnapshot | undefined;
  const visIssueKey = feature.vis_issue_key;
  if (visIssueKey) {
    lastRunFailure = await loadLastRunFailure(visIssueKey);
  }

  const snapshot: RoadmapContextSnapshot = {
    rowId: resolvedId,
    name: feature.name,
    category: feature.category,
    locatedPage: feature.locatedPage,
    percentage: typeof feature.percentage === 'number' ? feature.percentage : 0,
    phase: feature.phase ?? 'development',
    acceptanceCriteria: feature.acceptanceCriteria,

    latestDevLogSegment,
    devLog: feature.devLog,
    devLogDocContent,
    devLogDocPath,

    developmentProgress: feature.developmentProgress,
    testLog: feature.testLog,
    testLogDocPath: feature.testLogDocPath,

    featureSpecDocPath: feature.featureSpecDocPath,
    tddSpecDocPath: feature.tddSpecDocPath,

    unitFolder: resolveUnitTestFolder(feature, resolvedId),
    e2eFolder: resolveE2EFolder(resolvedId),

    visIssueId: feature.vis_issue_id,
    visIssueKey: feature.vis_issue_key,

    lastRunFailure,
  };

  const result: RoadmapContextResult = { ok: true, snapshot };
  return NextResponse.json(result, { status: 200 });
}
