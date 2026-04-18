// Row 145 Sprint 6 — ingest-orchestrator.ts unit tests.
//
// Covers tdd-spec §6.1 case list:
//   1. --stage=scan spawns the scan CLI exactly once (no parse/normalize/resolve)
//   2. --stage=all spawns all four CLIs in order + writes INSERT/UPDATE pair
//      to people_db_ingest_runs for each stage
//   3. child process non-zero exit → run status='failed', notes carry exit code
//   4. AbortSignal fires mid-stage → run status='interrupted', notes='SIGINT',
//      finished_at populated
//
// Supabase is mocked with an in-memory log; child_process.spawn is replaced
// with a fake EventEmitter ChildProcess so no subprocesses actually run.

import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';

import {
  STAGE_ORDER,
  buildStageArgs,
  resolveScriptPath,
  runOrchestrator,
  runStage,
  stagesToRun,
  type SpawnLike,
} from '../ingest-orchestrator';

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

interface InsertLog {
  table: string;
  row: Record<string, unknown>;
  returnedId: string;
}
interface UpdateLog {
  table: string;
  values: Record<string, unknown>;
  eqCol: string;
  eqVal: unknown;
}

function makeDb() {
  const inserts: InsertLog[] = [];
  const updates: UpdateLog[] = [];
  let nextId = 1;

  const from = (table: string) => ({
    insert: (row: Record<string, unknown>) => ({
      select: (_cols: string) => ({
        single: async () => {
          const id = `run-${nextId++}`;
          inserts.push({ table, row, returnedId: id });
          return { data: { id }, error: null };
        },
      }),
    }),
    update: (values: Record<string, unknown>) => ({
      eq: async (eqCol: string, eqVal: unknown) => {
        updates.push({ table, values, eqCol, eqVal });
        return { error: null };
      },
    }),
  });

  return {
    client: { from } as unknown as import('@supabase/supabase-js').SupabaseClient,
    inserts,
    updates,
  };
}

interface FakeChildOptions {
  exitCode?: number;
  stderr?: string;
  holdMs?: number; // delay before close event; used for abort tests
}

function makeSpawn(opts: FakeChildOptions | FakeChildOptions[] = {}): {
  spawn: SpawnLike;
  calls: Array<{ command: string; args: string[] }>;
  children: ChildProcess[];
} {
  const calls: Array<{ command: string; args: string[] }> = [];
  const children: ChildProcess[] = [];
  const queue = Array.isArray(opts) ? [...opts] : null;

  const spawn: SpawnLike = (command, args) => {
    calls.push({ command, args: [...args] });
    const child = new EventEmitter() as ChildProcess;
    // Attach stub stdio streams; orchestrator pipes them through but does
    // not inspect their contents.
    (child as unknown as { stdout: EventEmitter }).stdout = new EventEmitter();
    (child as unknown as { stderr: EventEmitter }).stderr = new EventEmitter();
    (child as unknown as { kill: (sig: string) => boolean }).kill = () => {
      child.emit('close', null);
      return true;
    };
    children.push(child);

    const o = queue ? (queue.shift() ?? {}) : (opts as FakeChildOptions);
    const exitCode = o.exitCode ?? 0;
    const stderr = o.stderr;
    const holdMs = o.holdMs ?? 0;

    const fire = () => {
      if (stderr) {
        (child as unknown as { stderr: EventEmitter }).stderr.emit('data', Buffer.from(stderr));
      }
      child.emit('close', exitCode);
    };
    if (holdMs > 0) setTimeout(fire, holdMs);
    else queueMicrotask(fire);
    return child;
  };

  return { spawn, calls, children };
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe('stagesToRun', () => {
  it('returns single stage for a specific stage', () => {
    expect(stagesToRun('scan')).toEqual(['scan']);
    expect(stagesToRun('parse')).toEqual(['parse']);
  });

  it('returns all four stages in pipeline order for "all"', () => {
    expect(stagesToRun('all')).toEqual([...STAGE_ORDER]);
    expect(STAGE_ORDER).toEqual(['scan', 'parse', 'normalize', 'resolve']);
  });
});

describe('resolveScriptPath', () => {
  it('joins script dir with stage filename', () => {
    expect(resolveScriptPath('scan', '/repo/tools/people-db')).toBe(
      '/repo/tools/people-db/scan.ts',
    );
  });
});

describe('buildStageArgs', () => {
  it('defaults to npx tsx with the stage script', () => {
    const { command, args } = buildStageArgs('parse', { scriptDir: '/t' });
    expect(command).toBe('npx');
    expect(args).toEqual(['tsx', '/t/parse.ts']);
  });

  it('appends --limit and --dry-run when provided', () => {
    const { args } = buildStageArgs('scan', { scriptDir: '/t', limit: 50, dryRun: true });
    expect(args).toEqual(['tsx', '/t/scan.ts', '--limit', '50', '--dry-run']);
  });
});

// ---------------------------------------------------------------------------
// Case 1: single stage
// ---------------------------------------------------------------------------

describe('runOrchestrator stage=scan', () => {
  it('spawns scan CLI exactly once and writes one ingest_runs pair', async () => {
    const db = makeDb();
    const { spawn, calls } = makeSpawn({ exitCode: 0 });

    const outcomes = await runOrchestrator(
      { supabase: db.client, spawn, scriptDir: '/tools/people-db' },
      { stage: 'scan' },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe('npx');
    expect(calls[0].args).toEqual(['tsx', '/tools/people-db/scan.ts']);

    // One insert (status='running'), one update (status='succeeded')
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0].table).toBe('people_db_ingest_runs');
    expect(db.inserts[0].row).toMatchObject({ stage: 'scan', status: 'running' });

    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].values).toMatchObject({ status: 'succeeded' });
    expect(db.updates[0].values.finished_at).toBeTruthy();
    expect(db.updates[0].eqVal).toBe('run-1');

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].status).toBe('succeeded');
    expect(outcomes[0].exitCode).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Case 2: full pipeline
// ---------------------------------------------------------------------------

describe('runOrchestrator stage=all', () => {
  it('spawns scan → parse → normalize → resolve in order', async () => {
    const db = makeDb();
    // Four children, all exit 0
    const { spawn, calls } = makeSpawn([{}, {}, {}, {}]);

    const outcomes = await runOrchestrator(
      { supabase: db.client, spawn, scriptDir: '/t' },
      { stage: 'all' },
    );

    expect(calls.map((c) => c.args[1])).toEqual([
      '/t/scan.ts',
      '/t/parse.ts',
      '/t/normalize.ts',
      '/t/resolve.ts',
    ]);

    // Four INSERT + four UPDATE rows, all against people_db_ingest_runs
    expect(db.inserts).toHaveLength(4);
    expect(db.updates).toHaveLength(4);
    expect(db.inserts.map((i) => i.row.stage)).toEqual(STAGE_ORDER);
    expect(db.updates.every((u) => u.values.status === 'succeeded')).toBe(true);

    expect(outcomes.map((o) => o.stage)).toEqual([...STAGE_ORDER]);
    expect(outcomes.every((o) => o.status === 'succeeded')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Case 3: stage fails (non-zero exit)
// ---------------------------------------------------------------------------

describe('runStage failure', () => {
  it('marks status=failed with exit code in notes when child exits non-zero', async () => {
    const db = makeDb();
    const { spawn } = makeSpawn({ exitCode: 2, stderr: 'mdb-tools missing' });

    const outcome = await runStage(
      { supabase: db.client, spawn, scriptDir: '/t' },
      'parse',
      {},
    );

    expect(outcome.status).toBe('failed');
    expect(outcome.exitCode).toBe(2);
    expect(db.updates[0].values.status).toBe('failed');
    expect(String(db.updates[0].values.notes ?? '')).toContain('exit code 2');
  });
});

// ---------------------------------------------------------------------------
// Case 4: abort mid-run
// ---------------------------------------------------------------------------

describe('runStage with AbortSignal', () => {
  it('marks status=interrupted with notes=SIGINT when signal aborts', async () => {
    const db = makeDb();
    // Child holds for 50ms; we abort after 5ms
    const { spawn } = makeSpawn({ exitCode: 0, holdMs: 50 });
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 5);

    const outcome = await runStage(
      { supabase: db.client, spawn, scriptDir: '/t', signal: ac.signal },
      'scan',
      {},
    );

    expect(outcome.status).toBe('interrupted');
    expect(outcome.notes).toBe('SIGINT');
    expect(db.updates[0].values.status).toBe('interrupted');
    expect(db.updates[0].values.finished_at).toBeTruthy();
    expect(db.updates[0].values.notes).toBe('SIGINT');
  });
});
