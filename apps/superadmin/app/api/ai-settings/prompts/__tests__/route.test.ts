// Issue #34 PR B — /api/ai-settings/prompts (GET + POST + DELETE) must
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
        limit: () => Promise.resolve({ data: [{ version: 1 }], error: null }),
        update: () => chain,
        insert: () => ({
          select: () => ({ single: () => Promise.resolve({ data: { id: '1' }, error: null }) }),
        }),
        then: terminal.then.bind(terminal),
      };
      return chain;
    },
  }),
}));

import { GET, POST, DELETE } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/ai-settings/prompts', { method: 'GET' });
}
function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/ai-settings/prompts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}
function deleteReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/ai-settings/prompts', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
});

describe('/api/ai-settings/prompts', () => {
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

  it('POST does not touch admin client when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(postReq({ moduleKey: 'foo', provider: 'anthropic' }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('DELETE does not touch admin client when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await DELETE(deleteReq({ promptId: 'abc' }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
