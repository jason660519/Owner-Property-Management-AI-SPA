// Regression tests for Issue #34 — /api/backup/cloud-settings must require a
// super_admin session on both GET (returns masked credential state) and POST
// (writes GDrive service-account JSON / S3 secret key).

import { NextRequest } from 'next/server';

// --- Auth mock -------------------------------------------------------------

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

// --- Admin client mock -----------------------------------------------------

const fromSpy = jest.fn();
const upsertSpy = jest.fn();
const loadedValue: { gdrive?: Record<string, unknown>; s3?: Record<string, unknown> } = {};

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => {
    const single = () => {
      const key = fromSpy.mock.calls.length > 0 ? null : null;
      void key;
      return Promise.resolve({ data: { value: {} }, error: null });
    };
    const eq = () => ({ single });
    const select = () => ({ eq });
    const upsert = (...args: unknown[]) => {
      upsertSpy(...args);
      return Promise.resolve({ error: null });
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
  return new NextRequest('http://localhost:3001/api/backup/cloud-settings', { method: 'GET' });
}
function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/backup/cloud-settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  loadedValue.gdrive = undefined;
  loadedValue.s3 = undefined;
});

describe('/api/backup/cloud-settings', () => {
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

  it('GET returns 200 with masked config for super_admin', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gdrive).toHaveProperty('configured');
    expect(body.s3).toHaveProperty('configured');
    // Masked: never return raw secrets
    expect(body.gdrive).not.toHaveProperty('service_account_json');
    expect(body.s3).not.toHaveProperty('secret_access_key');
    expect(fromSpy).toHaveBeenCalledWith('system_settings');
  });

  it('POST returns 401 when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(postReq({ gdrive: { enabled: true } }));
    expect(res.status).toBe(401);
    // The admin client must never be reached when auth fails — previously any
    // caller could overwrite GDrive service-account JSON / S3 secret key.
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('POST returns 200 and upserts credentials for super_admin', async () => {
    const res = await POST(postReq({ gdrive: { enabled: true, folder_id: 'xyz' } }));
    expect(res.status).toBe(200);
    expect(upsertSpy).toHaveBeenCalled();
  });

  it('POST with empty body is a no-op 200', async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(200);
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});
