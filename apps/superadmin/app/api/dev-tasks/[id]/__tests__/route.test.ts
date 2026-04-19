// Issue #34 PR G — /api/dev-tasks/[id] PATCH + POST are dual-track:
// superadmin session OR INTERNAL_API_KEY bearer (called by local-agent
// tooling at tools/local-agent/dev-tasks-agent.ts).
//
// GET handler migration to session-only is tracked in PR D (separate PR),
// so this test file does not cover GET.

import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
  source?: 'session' | 'internal';
  userId?: string | null;
}
const authState: AuthState = { ok: true, source: 'session', userId: 'admin-1' };

jest.mock('@/lib/auth/require-superadmin-or-internal', () => ({
  requireSuperadminOrInternal: jest.fn(async () => {
    if (authState.ok) {
      return { ok: true, source: authState.source ?? 'session', userId: authState.userId ?? null };
    }
    return { ok: false, status: authState.status ?? 401, message: 'denied' };
  }),
}));

// The GET handler still reads the legacy x-user-id / resolveUserId pair on
// this branch (PR G's sibling PR D migrates it). Mock resolveUserId so the
// GET default import does not blow up when the module evaluates.
jest.mock('@/lib/resolve-ai-settings-user', () => ({
  resolveUserId: jest.fn(async (_admin: unknown, uid: string) => uid),
}));

const fromSpy = jest.fn();

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      const maybeSingle = () => Promise.resolve({ data: { logs: ['old log'] }, error: null });
      const update = () => ({ eq: () => Promise.resolve({ error: null }) });
      return {
        select: () => ({ eq: () => ({ maybeSingle }) }),
        update,
      };
    },
  }),
}));

import { PATCH, POST } from '../route';

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
  authState.ok = true;
  authState.status = undefined;
  authState.source = 'session';
  authState.userId = 'admin-1';
});

describe('PATCH /api/dev-tasks/[id]', () => {
  it('returns 401 when neither session nor internal key is valid', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await PATCH(patchReq({ logs: ['new log'] }), {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('accepts internal-key caller (local-agent path)', async () => {
    authState.source = 'internal';
    authState.userId = null;
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

describe('POST /api/dev-tasks/[id]', () => {
  it('returns 401 when neither session nor internal key is valid', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(postReq({ status: 'succeeded' }), {
      params: Promise.resolve({ id: 'task-1' }),
    });
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('accepts internal-key caller and marks the task complete', async () => {
    authState.source = 'internal';
    authState.userId = null;
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
