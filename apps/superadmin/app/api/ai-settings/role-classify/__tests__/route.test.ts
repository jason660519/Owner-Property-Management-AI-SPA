// Issue #34 PR B — /api/ai-settings/role-classify (POST) must require a real
// superadmin session (no x-user-id fallback; body.userId is now ignored).

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

jest.mock('@/lib/crypto', () => ({
  decryptApiKey: jest.fn(async () => 'fake-api-key'),
}));

jest.mock('@/lib/utils/ai-api-callers', () => ({
  CALLERS: {},
  extractJsonFromOutput: () => ({ results: [] }),
}));

const fromSpy = jest.fn();
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
        upsert: () => Promise.resolve({ error: null }),
      };
      return chain;
    },
  }),
}));

import { POST } from '../route';

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/ai-settings/role-classify', {
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

describe('POST /api/ai-settings/role-classify', () => {
  it('returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(req({ mode: 'online', classifierProvider: 'anthropic', classifierModelId: 'claude-opus' }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 403 when auth fails with 403', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await POST(req({ mode: 'online', classifierProvider: 'anthropic', classifierModelId: 'claude-opus' }));
    expect(res.status).toBe(403);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 400 when required body fields missing (after auth passes)', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it('does not touch admin client when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(req({ mode: 'online', classifierProvider: 'anthropic', classifierModelId: 'claude-opus' }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
