// Regression tests for Issue #34 — /api/backup/run-logs must require a
// super_admin session before exposing the backup execution audit trail.

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
const selectSpy = jest.fn();
const queryResult: { data: unknown[] | null; error: null | { message: string } } = {
  data: [{ id: '1', trigger: 'manual' }],
  error: null,
};

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => {
    const limit = () => Promise.resolve(queryResult);
    const order = () => ({ limit });
    const select = (...args: unknown[]) => {
      selectSpy(...args);
      return { order };
    };
    const from = (table: string) => {
      fromSpy(table);
      return { select };
    };
    return { from };
  },
}));

// --- Import after mocks ----------------------------------------------------

import { GET } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/backup/run-logs', { method: 'GET' });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  queryResult.data = [{ id: '1', trigger: 'manual' }];
  queryResult.error = null;
});

describe('GET /api/backup/run-logs', () => {
  it('returns 401 when auth fails with 401', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 403 when auth fails with 403', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 200 with logs for super_admin', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.logs)).toBe(true);
    expect(fromSpy).toHaveBeenCalledWith('backup_run_logs');
  });

  it('returns 500 when the underlying query errors', async () => {
    queryResult.data = null;
    queryResult.error = { message: 'db down' };
    const res = await GET(getReq());
    expect(res.status).toBe(500);
  });

  it('does not query the database when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
    expect(selectSpy).not.toHaveBeenCalled();
  });
});
