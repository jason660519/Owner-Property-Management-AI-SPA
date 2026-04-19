// Issue #34 PR C — /api/paperclip/cron/configs (GET + PATCH) must be reachable
// via either a superadmin session OR the INTERNAL_API_KEY bearer token.

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

const fromSpy = jest.fn();
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      const terminal = Promise.resolve({ data: [], error: null });
      const chain = {
        select: () => chain,
        order: () => terminal,
        eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { job_type: 'agent_health' }, error: null }) }) }),
        update: () => chain,
        then: terminal.then.bind(terminal),
      };
      return chain;
    },
  }),
}));

import { GET, PATCH } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/paperclip/cron/configs', { method: 'GET' });
}
function patchReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/paperclip/cron/configs', {
    method: 'PATCH',
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

describe('/api/paperclip/cron/configs', () => {
  it('GET returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('GET returns 200 via internal key (server caller)', async () => {
    authState.ok = true;
    authState.source = 'internal';
    authState.userId = null;
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('paperclip_cron_configs');
  });

  it('PATCH returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await PATCH(patchReq({ job_type: 'agent_health', enabled: true }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('PATCH returns 200 via session', async () => {
    const res = await PATCH(patchReq({ job_type: 'agent_health', enabled: true }));
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('paperclip_cron_configs');
  });

  it('PATCH returns 400 for invalid job_type (after auth passes)', async () => {
    const res = await PATCH(patchReq({ job_type: 'bogus' }));
    expect(res.status).toBe(400);
  });
});
