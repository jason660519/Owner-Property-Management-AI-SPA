// Issue #34 PR D + PR G — /api/dev-tasks/[id]
// - GET handler (PR D): session-only via `requireSuperadmin`.
// - PATCH + POST handlers (PR G): dual-track via `requireSuperadminOrInternal`
//   because they're called by local-agent tooling at
//   tools/local-agent/dev-tasks-agent.ts, which has no session cookie.

import { NextRequest } from 'next/server';

interface SessionAuthState {
  ok: boolean;
  status?: 401 | 403;
  userId?: string;
}
const sessionAuthState: SessionAuthState = { ok: true, userId: 'admin-1' };

interface DualTrackAuthState {
  ok: boolean;
  status?: 401 | 403;
  source?: 'session' | 'internal';
  userId?: string | null;
}
const dualTrackAuthState: DualTrackAuthState = { ok: true, source: 'session', userId: 'admin-1' };

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(async () => {
    if (sessionAuthState.ok) {
      return {
        ok: true,
        userId: sessionAuthState.userId ?? 'admin-1',
        source: 'session' as const,
        viaSession: true,
      };
    }
    return { ok: false, status: sessionAuthState.status ?? 401, message: 'denied' };
  }),
}));

jest.mock('@/lib/auth/require-superadmin-or-internal', () => ({
  requireSuperadminOrInternal: jest.fn(async () => {
    if (dualTrackAuthState.ok) {
      return {
        ok: true,
        source: dualTrackAuthState.source ?? 'session',
        userId: dualTrackAuthState.userId ?? null,
      };
    }
    return { ok: false, status: dualTrackAuthState.status ?? 401, message: 'denied' };
  }),
}));

const fromSpy = jest.fn();

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      const maybeSingle = () =>
        Promise.resolve({
          data: { id: 'task-1', status: 'queued', logs: ['old log'] },
          error: null,
        });
      const update = () => ({ eq: () => Promise.resolve({ error: null }) });
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle }),
            maybeSingle,
          }),
        }),
        update,
      };
    },
  }),
}));

import { GET, PATCH, POST } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/dev-tasks/task-1', { method: 'GET' });
}
function patchReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/dev-tasks/task-1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}
function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/dev-tasks/task-1', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  sessionAuthState.ok = true;
  sessionAuthState.status = undefined;
  sessionAuthState.userId = 'admin-1';
  dualTrackAuthState.ok = true;
  dualTrackAuthState.status = undefined;
  dualTrackAuthState.source = 'session';
  dualTrackAuthState.userId = 'admin-1';
});

describe('GET /api/dev-tasks/[id] (session-only)', () => {
  it('returns 401 when auth fails', async () => {
    sessionAuthState.ok = false;
    sessionAuthState.status = 401;
    const res = await GET(getReq(), { params: Promise.resolve({ id: 'task-1' }) });
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 403 when auth fails with 403', async () => {
    sessionAuthState.ok = false;
    sessionAuthState.status = 403;
    const res = await GET(getReq(), { params: Promise.resolve({ id: 'task-1' }) });
    expect(res.status).toBe(403);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 200 with task for super_admin', async () => {
    const res = await GET(getReq(), { params: Promise.resolve({ id: 'task-1' }) });
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('dev_tasks');
  });
});

describe('PATCH /api/dev-tasks/[id] (dual-track)', () => {
  it('returns 401 when neither session nor internal key is valid', async () => {
    dualTrackAuthState.ok = false;
    dualTrackAuthState.status = 401;
    const res = await PATCH(patchReq({ logs: ['new log'] }), {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('accepts internal-key caller (local-agent path)', async () => {
    dualTrackAuthState.source = 'internal';
    dualTrackAuthState.userId = null;
    const res = await PATCH(patchReq({ logs: ['new log'] }), {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('dev_tasks');
  });

  it('accepts session caller', async () => {
    const res = await PATCH(patchReq({ logs: ['new log'] }), {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 400 when logs array is missing (after auth)', async () => {
    const res = await PATCH(patchReq({}), {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/dev-tasks/[id] (dual-track)', () => {
  it('returns 401 when neither session nor internal key is valid', async () => {
    dualTrackAuthState.ok = false;
    dualTrackAuthState.status = 401;
    const res = await POST(postReq({ status: 'succeeded' }), {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('accepts internal-key caller and marks the task complete', async () => {
    dualTrackAuthState.source = 'internal';
    dualTrackAuthState.userId = null;
    const res = await POST(
      postReq({ status: 'succeeded', resultSummary: { ok: true } }),
      { params: Promise.resolve({ id: 'task-1' }) },
    );
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('dev_tasks');
  });

  it('accepts session caller', async () => {
    const res = await POST(postReq({ status: 'failed' }), {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid status value (after auth)', async () => {
    const res = await POST(postReq({ status: 'bogus' }), {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(400);
  });
});
