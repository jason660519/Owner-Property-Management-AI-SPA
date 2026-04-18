// Row 145 Sprint 6 — ingest orchestrator core logic.
//
// Two layers (mirrors Sprint 4a entity-resolution.ts split):
//   1. pure helpers (stagesToRun / resolveScriptPath / buildStageArgs)
//      — unit-tested directly.
//   2. runStage / runOrchestrator — dependency-injected async functions
//      that spawn the existing stage CLIs and audit each run into
//      public.people_db_ingest_runs.
//
// The CLI shell (tools/people-db/ingest.ts) is a thin wrapper that
// parses argv, constructs a real SupabaseClient + child_process.spawn,
// wires a SIGINT handler to an AbortController, and calls
// runOrchestrator. Everything testable lives here.
//
// Audit contract:
//   - INSERT one row per stage with status='running' before spawn
//   - UPDATE that row on exit with status='succeeded' | 'failed' | 'interrupted'
//     plus finished_at and optional notes
//   - If a stage fails in --stage=all, subsequent stages are skipped
//     (short-circuit; matches operator expectations — parse failing
//     should not mask the issue by running normalize on stale data)

import type { ChildProcess, SpawnOptions } from 'node:child_process';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IngestStage = 'scan' | 'parse' | 'normalize' | 'resolve';
export const STAGE_ORDER: readonly IngestStage[] = [
  'scan',
  'parse',
  'normalize',
  'resolve',
] as const;

export type RunStatus = 'running' | 'succeeded' | 'failed' | 'interrupted';

export interface StageOutcome {
  stage: IngestStage;
  status: Exclude<RunStatus, 'running'>;
  exitCode: number | null;
  startedAt: Date;
  finishedAt: Date;
  runId: string | null;
  notes: string | null;
}

export interface OrchestratorOpts {
  stage: IngestStage | 'all';
  limit?: number;
  dryRun?: boolean;
}

export interface StageOpts {
  limit?: number;
  dryRun?: boolean;
}

export type SpawnLike = (
  command: string,
  args: readonly string[],
  options?: SpawnOptions,
) => ChildProcess;

export interface OrchestratorDeps {
  supabase: SupabaseClient;
  spawn: SpawnLike;
  scriptDir: string;
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function stagesToRun(stage: IngestStage | 'all'): IngestStage[] {
  if (stage === 'all') return [...STAGE_ORDER];
  return [stage];
}

export function resolveScriptPath(stage: IngestStage, scriptDir: string): string {
  return `${scriptDir}/${stage}.ts`;
}

export function buildStageArgs(
  stage: IngestStage,
  opts: StageOpts & { scriptDir: string },
): { command: string; args: string[] } {
  const args: string[] = ['tsx', resolveScriptPath(stage, opts.scriptDir)];
  if (opts.limit !== undefined) {
    args.push('--limit', String(opts.limit));
  }
  if (opts.dryRun) {
    args.push('--dry-run');
  }
  return { command: 'npx', args };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

interface RunRow {
  id: string;
}

async function insertRunningRow(
  supabase: SupabaseClient,
  stage: IngestStage,
  startedAt: Date,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('people_db_ingest_runs')
    .insert({
      stage,
      status: 'running',
      started_at: startedAt.toISOString(),
    })
    .select('id')
    .single();
  if (error) {
    // Do not throw — a missing audit row should not prevent the stage
    // from actually running. Log and continue with a null runId; the
    // stage outcome still returns normally.
    // eslint-disable-next-line no-console
    console.warn(`[ingest-orchestrator] failed to log start for ${stage}:`, error);
    return null;
  }
  return (data as RunRow | null)?.id ?? null;
}

async function updateRunRow(
  supabase: SupabaseClient,
  runId: string,
  values: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('people_db_ingest_runs')
    .update(values)
    .eq('id', runId);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn(`[ingest-orchestrator] failed to update run ${runId}:`, error);
  }
}

function waitForChild(
  child: ChildProcess,
  signal: AbortSignal | undefined,
): Promise<{ exitCode: number | null; aborted: boolean }> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (result: { exitCode: number | null; aborted: boolean }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const onClose = (code: number | null) => {
      if (signal?.aborted) {
        settle({ exitCode: code, aborted: true });
      } else {
        settle({ exitCode: code, aborted: false });
      }
    };
    child.on('close', onClose);
    child.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[ingest-orchestrator] spawn error:', err);
      settle({ exitCode: null, aborted: false });
    });

    if (signal) {
      if (signal.aborted) {
        try {
          child.kill('SIGINT');
        } catch {
          // ignore kill failures; child.on('close') will still fire
        }
        settle({ exitCode: null, aborted: true });
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          try {
            child.kill('SIGINT');
          } catch {
            // ignore
          }
          settle({ exitCode: null, aborted: true });
        },
        { once: true },
      );
    }
  });
}

export async function runStage(
  deps: OrchestratorDeps,
  stage: IngestStage,
  opts: StageOpts = {},
): Promise<StageOutcome> {
  const startedAt = new Date();
  const runId = await insertRunningRow(deps.supabase, stage, startedAt);

  const { command, args } = buildStageArgs(stage, {
    scriptDir: deps.scriptDir,
    limit: opts.limit,
    dryRun: opts.dryRun,
  });

  const child = deps.spawn(command, args, {
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  const { exitCode, aborted } = await waitForChild(child, deps.signal);
  const finishedAt = new Date();

  let status: Exclude<RunStatus, 'running'>;
  let notes: string | null;
  if (aborted) {
    status = 'interrupted';
    notes = 'SIGINT';
  } else if (exitCode === 0) {
    status = 'succeeded';
    notes = null;
  } else {
    status = 'failed';
    notes = exitCode === null ? 'spawn error' : `exit code ${exitCode}`;
  }

  if (runId) {
    await updateRunRow(deps.supabase, runId, {
      status,
      finished_at: finishedAt.toISOString(),
      notes,
    });
  }

  return {
    stage,
    status,
    exitCode,
    startedAt,
    finishedAt,
    runId,
    notes,
  };
}

export async function runOrchestrator(
  deps: OrchestratorDeps,
  opts: OrchestratorOpts,
): Promise<StageOutcome[]> {
  const stages = stagesToRun(opts.stage);
  const outcomes: StageOutcome[] = [];

  for (const stage of stages) {
    const outcome = await runStage(deps, stage, {
      limit: opts.limit,
      dryRun: opts.dryRun,
    });
    outcomes.push(outcome);

    // Short-circuit the pipeline on failure or interrupt so a broken
    // parse does not feed normalize with stale data. Single-stage runs
    // already return after one iteration so the check is a no-op there.
    if (outcome.status !== 'succeeded') break;
  }

  return outcomes;
}
