// Row 145 Sprint 4a Phase 2 — merge-candidates API route tests.
// Covers the three endpoints: GET list / POST confirm / POST reject.

import { NextRequest } from 'next/server';

// --- Mocks -----------------------------------------------------------------

interface AuthState {
  ok: boolean;
  userId?: string;
  responseStatus?: number;
}

const authState: AuthState = { ok: true, userId: 'admin-1' };

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: async () => {
    if (authState.ok) {
      return {
        ok: true,
        userId: authState.userId ?? 'admin-1',
        source: 'session' as const,
        viaSession: true,
      };
    }
    return {
      ok: false,
      status: (authState.responseStatus ?? 401) as 401 | 403,
      message: authState.responseStatus === 403 ? 'Forbidden' : 'Unauthorized',
    };
  },
}));

interface ListResult {
  data: unknown[];
  error: null | { message: string };
  count: number;
}
const listResult: ListResult = { data: [], error: null, count: 0 };

interface EmbedResult {
  data: unknown[];
  error: null | { message: string };
}
// Fixtures consulted when the list route performs an embed follow-up
// (?embed=person / ?embed=staging). Reset in beforeEach.
const personsResult: EmbedResult = { data: [], error: null };
const stagingResult: EmbedResult = { data: [], error: null };

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'people_db_persons') {
        return {
          select: (_c?: string) => ({
            in: async (_col: string, _ids: unknown[]) => ({
              data: personsResult.data,
              error: personsResult.error,
            }),
          }),
        };
      }
      if (table === 'people_db_staging_records') {
        return {
          select: (_c?: string) => ({
            in: async (_col: string, _ids: unknown[]) => ({
              data: stagingResult.data,
              error: stagingResult.error,
            }),
          }),
        };
      }
      // Default: people_db_merge_candidates (GET list pattern)
      const result = () => ({
        data: listResult.data,
        error: listResult.error,
        count: listResult.count,
      });
      const builder: {
        eq: () => typeof builder;
        order: () => { range: () => Promise<ReturnType<typeof result>> };
      } = {
        eq: () => builder,
        order: () => ({ range: async () => result() }),
      };
      return {
        select: (_c: string, _o?: unknown) => builder,
      };
    },
  }),
}));

jest.mock('@/lib/people-db/merge-candidates', () => {
  class CandidateStateError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'CandidateStateError';
    }
  }
  return {
    confirmCandidate: jest.fn(),
    rejectCandidate: jest.fn(),
    CandidateStateError,
  };
});

// --- Import routes after mocks are set up ---------------------------------

import { GET as GET_list } from '../route';
import { POST as POST_confirm } from '../[id]/confirm/route';
import { POST as POST_reject } from '../[id]/reject/route';
import * as mergeMod from '@/lib/people-db/merge-candidates';

const confirmCandidateMock = mergeMod.confirmCandidate as jest.Mock;
const rejectCandidateMock = mergeMod.rejectCandidate as jest.Mock;
const MockCandidateStateError = mergeMod.CandidateStateError;

// --- Helpers ---------------------------------------------------------------

function req(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

function postReq(url: string): NextRequest {
  return new NextRequest(url, { method: 'POST' });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.userId = 'admin-1';
  authState.responseStatus = undefined;
  listResult.data = [];
  listResult.error = null;
  listResult.count = 0;
  personsResult.data = [];
  personsResult.error = null;
  stagingResult.data = [];
  stagingResult.error = null;
});

// ---------------------------------------------------------------------------

describe('GET /api/people-db/merge-candidates', () => {
  it('returns 200 with total + items when authorized', async () => {
    listResult.data = [
      { id: 'c1', status: 'pending', confidence: 0.85 },
      { id: 'c2', status: 'pending', confidence: 0.7 },
    ];
    listResult.count = 2;

    const res = await GET_list(req('http://localhost/api/people-db/merge-candidates'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(2);
    expect(body.items).toHaveLength(2);
    expect(body.page).toBe(1);
  });

  it('returns 401 when unauthorized', async () => {
    authState.ok = false;
    authState.responseStatus = 401;
    const res = await GET_list(req('http://localhost/api/people-db/merge-candidates'));
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Sprint 4b: ?embed=person,staging attaches joined data for the admin UI's
// left/right comparison cards. Without it, the client would need N+1 lookups.
// ---------------------------------------------------------------------------

describe('GET /api/people-db/merge-candidates (embed)', () => {
  const candidates = [
    {
      id: 'c1',
      person_a_id: 'p1',
      record_b_id: 's1',
      match_reason: 'name_phone',
      confidence: 0.85,
      status: 'pending',
    },
    {
      id: 'c2',
      person_a_id: 'p2',
      record_b_id: 's2',
      match_reason: 'name_addr',
      confidence: 0.7,
      status: 'pending',
    },
  ];

  const persons = [
    {
      person_id: 'p1',
      canonical_name: '王小明',
      canonical_id_no: null,
      canonical_phones: ['0912345678'],
      canonical_address: '台北市中山區中山北路一段100號',
      source_count: 3,
      quality_score: 0.85,
    },
    {
      person_id: 'p2',
      canonical_name: '李大華',
      canonical_id_no: 'A123456789',
      canonical_phones: [],
      canonical_address: null,
      source_count: 1,
      quality_score: null,
    },
  ];

  const staging = [
    {
      id: 's1',
      file_id: 'f1',
      record_index: 0,
      normalized: { name: '王小明', phones: ['0912345678'] },
      created_at: '2026-04-19T00:00:00Z',
    },
    {
      id: 's2',
      file_id: 'f2',
      record_index: 4,
      normalized: { name: '李大華', address: { raw: '高雄市…' } },
      created_at: '2026-04-19T00:05:00Z',
    },
  ];

  it('attaches person fixture when ?embed=person', async () => {
    listResult.data = [...candidates];
    listResult.count = 2;
    personsResult.data = [...persons];

    const res = await GET_list(
      req('http://localhost/api/people-db/merge-candidates?embed=person'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.items[0].person).toMatchObject({ person_id: 'p1', canonical_name: '王小明' });
    expect(body.items[1].person).toMatchObject({ person_id: 'p2', canonical_name: '李大華' });
    // staging not requested — must not be attached
    expect(body.items[0].staging).toBeUndefined();
  });

  it('attaches staging fixture when ?embed=staging', async () => {
    listResult.data = [...candidates];
    listResult.count = 2;
    stagingResult.data = [...staging];

    const res = await GET_list(
      req('http://localhost/api/people-db/merge-candidates?embed=staging'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].staging).toMatchObject({ id: 's1', record_index: 0 });
    expect(body.items[1].staging).toMatchObject({ id: 's2', record_index: 4 });
    expect(body.items[0].person).toBeUndefined();
  });

  it('attaches both when ?embed=person,staging', async () => {
    listResult.data = [...candidates];
    listResult.count = 2;
    personsResult.data = [...persons];
    stagingResult.data = [...staging];

    const res = await GET_list(
      req('http://localhost/api/people-db/merge-candidates?embed=person,staging'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].person.person_id).toBe('p1');
    expect(body.items[0].staging.id).toBe('s1');
  });

  it('ignores unknown embed tokens without failing', async () => {
    listResult.data = [...candidates];
    listResult.count = 2;

    const res = await GET_list(
      req('http://localhost/api/people-db/merge-candidates?embed=person,bogus'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // person still enriched (even if fixture empty → null), bogus is noop
    expect('person' in body.items[0]).toBe(true);
    expect('bogus' in body.items[0]).toBe(false);
  });

  it('returns null for missing person / staging rows (no throw on orphans)', async () => {
    listResult.data = [candidates[0]];
    listResult.count = 1;
    // persons fixture empty — p1 has no matching person row
    personsResult.data = [];
    stagingResult.data = [];

    const res = await GET_list(
      req('http://localhost/api/people-db/merge-candidates?embed=person,staging'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].person).toBeNull();
    expect(body.items[0].staging).toBeNull();
  });

  it('omits embed fields entirely when no embed param is provided', async () => {
    listResult.data = [...candidates];
    listResult.count = 2;

    const res = await GET_list(
      req('http://localhost/api/people-db/merge-candidates'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect('person' in body.items[0]).toBe(false);
    expect('staging' in body.items[0]).toBe(false);
  });
});

describe('POST /api/people-db/merge-candidates/[id]/confirm', () => {
  it('returns 200 and calls confirmCandidate with the admin user id', async () => {
    confirmCandidateMock.mockResolvedValueOnce(undefined);
    const res = await POST_confirm(
      postReq('http://localhost/api/people-db/merge-candidates/c1/confirm'),
      { params: Promise.resolve({ id: 'c1' }) },
    );
    expect(res.status).toBe(200);
    expect(confirmCandidateMock).toHaveBeenCalledWith(expect.anything(), 'c1', 'admin-1');
  });

  it('returns 409 when candidate is already decided (CandidateStateError)', async () => {
    confirmCandidateMock.mockRejectedValueOnce(
      new MockCandidateStateError('Candidate c1 is already confirmed'),
    );
    const res = await POST_confirm(
      postReq('http://localhost/api/people-db/merge-candidates/c1/confirm'),
      { params: Promise.resolve({ id: 'c1' }) },
    );
    expect(res.status).toBe(409);
  });

  it('returns 401 when unauthorized', async () => {
    authState.ok = false;
    authState.responseStatus = 401;
    const res = await POST_confirm(
      postReq('http://localhost/api/people-db/merge-candidates/c1/confirm'),
      { params: Promise.resolve({ id: 'c1' }) },
    );
    expect(res.status).toBe(401);
    expect(confirmCandidateMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/people-db/merge-candidates/[id]/reject', () => {
  it('returns 200 and calls rejectCandidate with the admin user id', async () => {
    rejectCandidateMock.mockResolvedValueOnce(undefined);
    const res = await POST_reject(
      postReq('http://localhost/api/people-db/merge-candidates/c1/reject'),
      { params: Promise.resolve({ id: 'c1' }) },
    );
    expect(res.status).toBe(200);
    expect(rejectCandidateMock).toHaveBeenCalledWith(expect.anything(), 'c1', 'admin-1');
  });

  it('returns 500 on unexpected error (not CandidateStateError)', async () => {
    rejectCandidateMock.mockRejectedValueOnce(new Error('DB connection lost'));
    const res = await POST_reject(
      postReq('http://localhost/api/people-db/merge-candidates/c1/reject'),
      { params: Promise.resolve({ id: 'c1' }) },
    );
    expect(res.status).toBe(500);
  });
});
