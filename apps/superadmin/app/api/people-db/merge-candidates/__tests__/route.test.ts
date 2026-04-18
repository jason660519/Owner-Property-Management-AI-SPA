// Row 145 Sprint 4a Phase 2 — merge-candidates API route tests.
// Covers the three endpoints: GET list / POST confirm / POST reject.

import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// --- Mocks -----------------------------------------------------------------

interface AuthState {
  ok: boolean;
  userId?: string;
  responseStatus?: number;
}

const authState: AuthState = { ok: true, userId: 'admin-1' };

jest.mock('@/lib/people-db/es-gateway', () => ({
  requireSuperAdmin: async () => {
    if (authState.ok) {
      return { ok: true, user: { userId: authState.userId ?? 'admin-1' } };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { detail: authState.responseStatus === 403 ? 'Forbidden' : 'Unauthorized' },
        { status: authState.responseStatus ?? 401 },
      ),
    };
  },
}));

interface ListResult {
  data: unknown[];
  error: null | { message: string };
  count: number;
}
const listResult: ListResult = { data: [], error: null, count: 0 };

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (_table: string) => {
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
