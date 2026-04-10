// Tests for lib/ai/ensure-seeded.ts. See ai-prompt-safety-guide Phase 4.

import {
  __resetEnsureSeededForTests,
  ensureDefaultPromptsSeededOnce,
  seedDefaultPromptsDirect,
} from '../ensure-seeded';

// ---------------------------------------------------------------------------
// Fake admin client
// ---------------------------------------------------------------------------

interface ExistingRow {
  name: string;
  module_key: string | null;
}

function makeFakeClient(initial: {
  existingRows?: ExistingRow[];
  selectError?: string;
  insertError?: string;
}) {
  const rows: ExistingRow[] = [...(initial.existingRows ?? [])];
  const inserts: Array<Record<string, unknown>> = [];

  const client = {
    from(_table: string) {
      return {
        select() {
          if (initial.selectError) {
            return Promise.resolve({ data: null, error: { message: initial.selectError } });
          }
          return Promise.resolve({ data: rows, error: null });
        },
        insert(row: Record<string, unknown>) {
          if (initial.insertError) {
            return Promise.resolve({ error: { message: initial.insertError } });
          }
          inserts.push(row);
          rows.push({
            name: row.name as string,
            module_key: (row.module_key as string | null) ?? null,
          });
          return Promise.resolve({ error: null });
        },
      };
    },
  } as any;

  return {
    client,
    getInserts: () => inserts,
    getRows: () => rows,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('seedDefaultPromptsDirect', () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    __resetEnsureSeededForTests();
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('creates all canonical prompts when the table is empty', async () => {
    const { client, getInserts } = makeFakeClient({ existingRows: [] });

    const result = await seedDefaultPromptsDirect(client);

    expect(result.errors).toEqual([]);
    expect(result.created).toBeGreaterThan(0);
    expect(result.skipped).toBe(0);

    const moduleKeys = getInserts().map((row) => row.module_key);
    // Key canonical modules that MUST be present after a seed.
    expect(moduleKeys).toContain('transcript.parse');
    expect(moduleKeys).toContain('transcript.judge');
    expect(moduleKeys).toContain('transcript.detect_building_count');
    expect(moduleKeys).toContain('transcript.detect_land_count');
    expect(moduleKeys).toContain('property.description.default');
  });

  it('skips rows whose name OR module_key already exists', async () => {
    const existingRows: ExistingRow[] = [
      { name: '謄本解析-通用基礎', module_key: 'transcript.parse' },
      { name: '另一個別名', module_key: 'property.description.default' },
    ];
    const { client, getInserts } = makeFakeClient({ existingRows });

    const result = await seedDefaultPromptsDirect(client);

    expect(result.errors).toEqual([]);
    expect(result.skipped).toBeGreaterThanOrEqual(2);

    const insertedModuleKeys = getInserts().map((row) => row.module_key);
    expect(insertedModuleKeys).not.toContain('transcript.parse');
    expect(insertedModuleKeys).not.toContain('property.description.default');
  });

  it('is idempotent — a second seed run produces no new inserts', async () => {
    const { client, getInserts } = makeFakeClient({ existingRows: [] });

    await seedDefaultPromptsDirect(client);
    const firstRun = getInserts().length;

    await seedDefaultPromptsDirect(client);
    const secondRun = getInserts().length;

    expect(secondRun).toBe(firstRun);
  });

  it('records an error entry and continues when an individual insert fails', async () => {
    const { client } = makeFakeClient({
      existingRows: [],
      insertError: 'permission denied',
    });

    const result = await seedDefaultPromptsDirect(client);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/permission denied/);
    expect(result.created).toBe(0);
  });

  it('returns an error-only result when the initial read fails', async () => {
    const { client } = makeFakeClient({
      selectError: 'connection refused',
    });

    const result = await seedDefaultPromptsDirect(client);

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors[0]).toContain('connection refused');
  });
});

describe('ensureDefaultPromptsSeededOnce', () => {
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    __resetEnsureSeededForTests();
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it('runs the seed exactly once per process (memoization)', async () => {
    let selectCalls = 0;
    const client = {
      from() {
        return {
          select: () => {
            selectCalls += 1;
            return Promise.resolve({ data: [], error: null });
          },
          insert: () => Promise.resolve({ error: null }),
        };
      },
    } as any;

    await ensureDefaultPromptsSeededOnce(client);
    const after1 = selectCalls;

    await ensureDefaultPromptsSeededOnce(client);
    const after2 = selectCalls;

    // Second call must NOT re-query — it returns the memoized promise.
    expect(after2).toBe(after1);
  });

  it('returns the same result object from repeated calls', async () => {
    const { client } = makeFakeClient({ existingRows: [] });

    const first = await ensureDefaultPromptsSeededOnce(client);
    const second = await ensureDefaultPromptsSeededOnce(client);

    expect(second).toBe(first);
  });

  it('resets cleanly for subsequent tests via __resetEnsureSeededForTests', async () => {
    const { client } = makeFakeClient({ existingRows: [] });

    await ensureDefaultPromptsSeededOnce(client);
    __resetEnsureSeededForTests();

    const { client: client2, getInserts } = makeFakeClient({ existingRows: [] });
    await ensureDefaultPromptsSeededOnce(client2);
    expect(getInserts().length).toBeGreaterThan(0);
  });
});
