// Issue #34 PR C — /api/paperclip/task-queue/poll (GET) is the server-side
// cron poller. Guarded by requireSuperadminOrInternal so it can be driven by
// scheduled-tasks MCP (via INTERNAL_API_KEY) AND by an operator manually
// kicking it from the superadmin UI.

import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
  source?: 'session' | 'internal';
  userId?: string | null;
}
const authState: AuthState = { ok: true, source: 'internal', userId: null };

jest.mock('@/lib/auth/require-superadmin-or-internal', () => ({
  requireSuperadminOrInternal: jest.fn(async () => {
    if (authState.ok) {
      return { ok: true, source: authState.source ?? 'internal', userId: authState.userId ?? null };
    }
    return { ok: false, status: authState.status ?? 401, message: 'denied' };
  }),
}));

const getAgentRuntimeSpy = jest.fn();
jest.mock('@/lib/agent-runtime', () => ({
  getAgentRuntime: () => {
    getAgentRuntimeSpy();
    return { ok: false, status: 500, error: 'no runtime' };
  },
}));

const fromSpy = jest.fn();
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      return {
        select: () => ({
          in: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
    },
  }),
}));

import { GET } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/paperclip/task-queue/poll', { method: 'GET' });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  authState.source = 'internal';
  authState.userId = null;
});

describe('GET /api/paperclip/task-queue/poll', () => {
  it('returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    // Regression guard: no runtime or DB contact before auth passes.
    expect(getAgentRuntimeSpy).not.toHaveBeenCalled();
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 403 when session lacks super_admin role', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    expect(getAgentRuntimeSpy).not.toHaveBeenCalled();
  });

  it('proceeds to runtime lookup when called via internal key (cron path)', async () => {
    // Runtime mock returns not-ok → route returns 500, but this confirms auth
    // let the request through.
    const res = await GET(getReq());
    expect(res.status).toBe(500);
    expect(getAgentRuntimeSpy).toHaveBeenCalled();
  });

  it('proceeds when called via a superadmin session (manual UI trigger)', async () => {
    authState.source = 'session';
    authState.userId = 'admin-1';
    const res = await GET(getReq());
    expect(res.status).toBe(500);
    expect(getAgentRuntimeSpy).toHaveBeenCalled();
  });
});
