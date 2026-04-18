// Row 145 Sprint 4a Phase 2 — merge-candidates CRUD unit tests.
// Uses an in-memory Supabase mock to exercise upsert / update / select
// chains without standing up Postgres.

import {
  createCandidate,
  confirmCandidate,
  rejectCandidate,
  CandidateStateError,
} from '../merge-candidates';

interface Row {
  id: string;
  person_a_id: string;
  record_b_id: string;
  match_reason: 'name_phone' | 'name_addr';
  confidence: number;
  status: 'pending' | 'confirmed' | 'rejected';
  decided_by?: string | null;
  decided_at?: string | null;
}

interface SourceRow {
  person_id: string;
  record_id: string;
  match_reason: string;
}

interface BlacklistRow {
  person_a_id: string;
  record_b_id: string;
}

const candidates = new Map<string, Row>();
const sources: SourceRow[] = [];
const blacklist: BlacklistRow[] = [];
let nextId = 1;

function resetStore(): void {
  candidates.clear();
  sources.length = 0;
  blacklist.length = 0;
  nextId = 1;
}

type UpsertOpts = { onConflict?: string; ignoreDuplicates?: boolean };

function makeDb() {
  return {
    from: (table: string) => ({
      select: (_cols: string) => ({
        eq: (col: string, val: unknown) => ({
          maybeSingle: async () => {
            if (table === 'people_db_merge_candidates') {
              for (const row of candidates.values()) {
                if ((row as unknown as Record<string, unknown>)[col] === val) {
                  return { data: row, error: null };
                }
              }
            }
            return { data: null, error: null };
          },
        }),
      }),
      upsert: async (
        incoming: Row | Row[] | BlacklistRow | BlacklistRow[],
        opts?: UpsertOpts,
      ) => {
        const arr = Array.isArray(incoming) ? incoming : [incoming];
        if (table === 'people_db_merge_candidates') {
          for (const r of arr as Row[]) {
            const existing = [...candidates.values()].find(
              (c) => c.person_a_id === r.person_a_id && c.record_b_id === r.record_b_id,
            );
            if (existing) {
              if (!opts?.ignoreDuplicates) {
                Object.assign(existing, r);
              }
              continue;
            }
            const id = `cand-${nextId++}`;
            candidates.set(id, { ...r, id } as Row);
          }
        } else if (table === 'people_db_merge_blacklist') {
          for (const r of arr as BlacklistRow[]) {
            const dup = blacklist.find(
              (b) => b.person_a_id === r.person_a_id && b.record_b_id === r.record_b_id,
            );
            if (!dup) blacklist.push(r);
          }
        }
        return { error: null };
      },
      insert: async (incoming: SourceRow | SourceRow[]) => {
        const arr = Array.isArray(incoming) ? incoming : [incoming];
        if (table === 'people_db_person_sources') {
          sources.push(...arr);
        }
        return { error: null };
      },
      update: (values: Partial<Row>) => ({
        eq: async (col: string, val: unknown) => {
          if (table === 'people_db_merge_candidates') {
            for (const row of candidates.values()) {
              if ((row as unknown as Record<string, unknown>)[col] === val) {
                Object.assign(row, values);
                return { error: null };
              }
            }
          }
          return { error: null };
        },
      }),
    }),
  };
}

beforeEach(() => {
  resetStore();
});

describe('createCandidate', () => {
  it('inserts a new pending row', async () => {
    const db = makeDb();
    await createCandidate(db as unknown as Parameters<typeof createCandidate>[0], {
      person_a_id: 'p1',
      record_b_id: 'r1',
      match_reason: 'name_phone',
      confidence: 0.85,
    });
    expect(candidates.size).toBe(1);
    const row = [...candidates.values()][0];
    expect(row.status).toBe('pending');
    expect(row.confidence).toBe(0.85);
  });

  it('is idempotent on the same (person, record) pair (no duplicate)', async () => {
    const db = makeDb();
    const input = {
      person_a_id: 'p1',
      record_b_id: 'r1',
      match_reason: 'name_phone' as const,
      confidence: 0.85,
    };
    await createCandidate(db as unknown as Parameters<typeof createCandidate>[0], input);
    await createCandidate(db as unknown as Parameters<typeof createCandidate>[0], input);
    expect(candidates.size).toBe(1);
  });
});

describe('confirmCandidate', () => {
  it('inserts person_sources + marks status=confirmed + no blacklist', async () => {
    const db = makeDb();
    candidates.set('cand-1', {
      id: 'cand-1',
      person_a_id: 'p1',
      record_b_id: 'r1',
      match_reason: 'name_phone',
      confidence: 0.85,
      status: 'pending',
    });

    await confirmCandidate(
      db as unknown as Parameters<typeof confirmCandidate>[0],
      'cand-1',
      'user-admin',
    );

    expect(sources).toHaveLength(1);
    expect(sources[0]).toEqual({
      person_id: 'p1',
      record_id: 'r1',
      match_reason: 'confirmed_name_phone',
    });
    expect(candidates.get('cand-1')?.status).toBe('confirmed');
    expect(candidates.get('cand-1')?.decided_by).toBe('user-admin');
    expect(blacklist).toHaveLength(0); // confirm must NOT blacklist
  });

  it('throws CandidateStateError when candidate is already decided', async () => {
    const db = makeDb();
    candidates.set('cand-1', {
      id: 'cand-1',
      person_a_id: 'p1',
      record_b_id: 'r1',
      match_reason: 'name_phone',
      confidence: 0.85,
      status: 'confirmed', // already decided
    });
    await expect(
      confirmCandidate(db as unknown as Parameters<typeof confirmCandidate>[0], 'cand-1', 'u'),
    ).rejects.toBeInstanceOf(CandidateStateError);
  });
});

describe('rejectCandidate', () => {
  it('inserts blacklist + marks status=rejected', async () => {
    const db = makeDb();
    candidates.set('cand-1', {
      id: 'cand-1',
      person_a_id: 'p1',
      record_b_id: 'r1',
      match_reason: 'name_addr',
      confidence: 0.7,
      status: 'pending',
    });

    await rejectCandidate(
      db as unknown as Parameters<typeof rejectCandidate>[0],
      'cand-1',
      'user-admin',
    );

    expect(blacklist).toHaveLength(1);
    expect(blacklist[0]).toEqual({ person_a_id: 'p1', record_b_id: 'r1' });
    expect(candidates.get('cand-1')?.status).toBe('rejected');
    expect(sources).toHaveLength(0); // reject must NOT write a source
  });

  it('throws CandidateStateError when candidate does not exist', async () => {
    const db = makeDb();
    await expect(
      rejectCandidate(db as unknown as Parameters<typeof rejectCandidate>[0], 'nope', 'u'),
    ).rejects.toBeInstanceOf(CandidateStateError);
  });
});
