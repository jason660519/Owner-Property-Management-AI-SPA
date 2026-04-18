// Regression tests for Issue #34 — /api/backup/settings must require a
// super_admin session on both GET and POST before using the admin client.

import { NextRequest } from 'next/server';

// --- Auth mock -------------------------------------------------------------

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
  message?: string;
}
const authState: AuthState = { ok: true };

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(async () => {
    if (authState.ok) {
      return { ok: true, userId: 'admin-1', source: 'session' as const, viaSession: true };
    }
    return {
      ok: false,
      status: authState.status ?? 401,
      message: authState.message ?? 'Unauthorized',
    };
  }),
}));

// --- Admin client mock -----------------------------------------------------

const upsertSpy = jest.fn();
const fromSpy = jest.fn();
const selectSpy = jest.fn();
const upsertError: { value: null | { message: string } } = { value: null };

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => {
    const single = () => Promise.resolve({ data: { value: {} }, error: null });
    const eq = () => ({ single });
    const select = () => {
      selectSpy();
      return { eq };
    };
    const upsert = (...args: unknown[]) => {
      upsertSpy(...args);
      return Promise.resolve({ error: upsertError.value });
    };
    const from = (table: string) => {
      fromSpy(table);
      return { select, upsert };
    };
    return { from };
  },
}));

// --- Import after mocks ----------------------------------------------------

import { GET, POST } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/backup/settings', { method: 'GET' });
}
function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/backup/settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  upsertError.value = null;
});

describe('/api/backup/settings', () => {
  it('GET returns 401 when auth fails with 401', async () => {
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

  it('GET returns 200 with normalized settings for super_admin', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('system_settings');
    expect(selectSpy).toHaveBeenCalled();
  });

  it('POST returns 401 when auth fails (regression guard for Issue #34)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(postReq({ local_device_enabled: true }));
    expect(res.status).toBe(401);
    // The admin client must never be reached when auth fails.
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('POST returns 200 and upserts for super_admin', async () => {
    const res = await POST(postReq({ local_device_enabled: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(upsertSpy).toHaveBeenCalled();
  });

  it('POST returns 500 when upsert fails', async () => {
    upsertError.value = { message: 'db down' };
    const res = await POST(postReq({ local_device_enabled: true }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
