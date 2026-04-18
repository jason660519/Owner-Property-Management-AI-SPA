// Issue #34 PR B — /api/ai-billing/anthropic (GET + POST) must require a
// real superadmin session. Previously this endpoint had NO auth at all
// (the comment claimed PAPERCLIP_API_KEY middleware, but it was never wired).

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

const loadConfigSpy = jest.fn();
const spendSpy = jest.fn();

jest.mock('@/lib/ai/anthropic-credit-guard', () => ({
  loadCreditGuardConfig: (...args: unknown[]) => {
    loadConfigSpy(...args);
    return Promise.resolve({
      id: 'cfg-1',
      total_credits_usd: 100,
      alert_threshold_usd: 10,
      circuit_breaker_threshold_usd: 5,
      tracking_start_at: '2026-01-01T00:00:00Z',
      circuit_breaker_active: false,
    });
  },
  getPaperclipSpendUsd: (...args: unknown[]) => {
    spendSpy(...args);
    return Promise.resolve(25);
  },
  evaluateCreditStatus: () => ({
    remaining_usd: 75,
    alert_triggered: false,
    circuit_breaker_triggered: false,
  }),
}));

const fromSpy = jest.fn();
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      const eq = () => Promise.resolve({ error: null });
      const update = () => ({ eq });
      return { update };
    },
  }),
}));

import { GET, POST } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/ai-billing/anthropic', { method: 'GET' });
}
function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/ai-billing/anthropic', {
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

describe('/api/ai-billing/anthropic', () => {
  it('GET returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    expect(loadConfigSpy).not.toHaveBeenCalled();
  });

  it('GET returns 403 when auth fails with 403', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    expect(loadConfigSpy).not.toHaveBeenCalled();
  });

  it('GET returns 200 with config and status for super_admin', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.config).toBeDefined();
    expect(body.status).toBeDefined();
    expect(loadConfigSpy).toHaveBeenCalled();
  });

  it('POST does not touch credit guard when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(postReq({ total_credits_usd: 200 }));
    expect(res.status).toBe(401);
    expect(loadConfigSpy).not.toHaveBeenCalled();
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
