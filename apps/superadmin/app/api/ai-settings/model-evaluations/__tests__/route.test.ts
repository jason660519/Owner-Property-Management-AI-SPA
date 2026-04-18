// Issue #34 PR B — /api/ai-settings/model-evaluations (GET + POST) must
// require a real superadmin session.

import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
}
const authState: AuthState = { ok: true };

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(async () => {
    if (authState.ok) {
      return { ok: true, userId: 'admin-1', source: 'session' as const, viaSession: true };
    }
    return { ok: false, status: authState.status ?? 401, message: 'denied' };
  }),
}));

const fromSpy = jest.fn();

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      const terminal = Promise.resolve({ data: [], error: null });
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        upsert: () => ({ select: () => terminal }),
        then: terminal.then.bind(terminal),
      };
      return chain;
    },
  }),
}));

import { GET, POST } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/ai-settings/model-evaluations', { method: 'GET' });
}
function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/ai-settings/model-evaluations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
});

describe('/api/ai-settings/model-evaluations', () => {
  it('GET returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('GET returns 403 when auth fails with 403', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('GET returns 200 with evaluations for super_admin', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('ai_model_evaluations');
  });

  it('POST does not touch admin client when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(postReq({ evaluations: [] }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
