// Issue #34 PR C — /api/paperclip/task-queue/assign (POST) guarded by
// requireSuperadminOrInternal (internal-key allowed: assign is admin action).

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

jest.mock('@/lib/agent-runtime', () => ({
  getAgentRuntime: () => ({ ok: false, status: 500, error: 'no runtime' }),
}));

const fromSpy = jest.fn();

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      const maybeSingle = () =>
        Promise.resolve({
          data: { id: 'task-1', issue_id: 'issue-1', assigned_agent: 'agent-1' },
          error: null,
        });
      const inQuery = () => ({ maybeSingle });
      const eqSelect = () => ({ in: inQuery });
      const selectAfterUpdate = () => ({ single: () => Promise.resolve({ data: { id: 'task-1' }, error: null }) });
      const eqAfterUpdate = () => ({ select: selectAfterUpdate });
      const chain = {
        select: () => ({ eq: eqSelect }),
        update: () => ({ eq: eqAfterUpdate }),
      };
      return chain;
    },
  }),
}));

import { POST } from '../route';

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/paperclip/task-queue/assign', {
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

describe('POST /api/paperclip/task-queue/assign', () => {
  it('returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(req({ rowId: '001', assigneeUserId: 'u2' }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 200 via internal key', async () => {
    authState.source = 'internal';
    authState.userId = null;
    const res = await POST(req({ rowId: '001', assigneeUserId: 'u2' }));
    expect(res.status).toBe(200);
  });

  it('returns 200 via session', async () => {
    const res = await POST(req({ rowId: '001', assigneeUserId: 'u2' }));
    expect(res.status).toBe(200);
  });

  it('returns 400 when required fields missing', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });
});
