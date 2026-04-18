// Issue #34 PR B — /api/ai-settings/agent-assignments (GET + PUT + DELETE)
// must require a real superadmin session. Previously GET had no auth at all.

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

jest.mock('@/lib/ai/agent-registry', () => ({
  VALID_AGENT_KEYS: new Set(['test_agent']),
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
        order: () => terminal,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        upsert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: {
                id: '1', agent_key: 'test_agent', is_enabled: true,
                primary_provider: 'x', primary_model_id: 'y',
                primary_config: {}, fallbacks: [], guardrails: {},
                notes: null, updated_by: null,
                updated_at: '2026-01-01T00:00:00Z',
                created_at: '2026-01-01T00:00:00Z',
              },
              error: null,
            }),
          }),
        }),
        delete: () => chain,
        then: terminal.then.bind(terminal),
      };
      return chain;
    },
  }),
}));

import { GET, PUT, DELETE } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/ai-settings/agent-assignments', { method: 'GET' });
}
function putReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/ai-settings/agent-assignments', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}
function deleteReq(params: string): NextRequest {
  return new NextRequest(`http://localhost:3001/api/ai-settings/agent-assignments?${params}`, { method: 'DELETE' });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
});

describe('/api/ai-settings/agent-assignments', () => {
  it('GET returns 401 when auth fails (was previously no-auth)', async () => {
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

  it('GET returns 200 with assignments for super_admin', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('ai_agent_model_assignments');
  });

  it('PUT does not touch admin client when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await PUT(putReq({ agent_key: 'test_agent', primary_provider: 'x', primary_model_id: 'y' }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('DELETE does not touch admin client when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await DELETE(deleteReq('agent_key=test_agent'));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
