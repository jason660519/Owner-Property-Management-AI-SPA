// Regression tests for Issue #34 — /api/iam/audit must require a super_admin
// session before invoking admin.auth.admin.listUsers() or reading rbac_audit_logs.
// Without the guard, any unauthenticated caller can enumerate every registered
// email, IAM group, role, and audit trail in a single request.

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

const listUsersSpy = jest.fn();
const fromSpy = jest.fn();
const rpcSpy = jest.fn();

interface TableState {
  data: unknown;
  error: null | { message: string };
}
const tableState: Record<string, TableState> = {
  iam_groups: { data: [], error: null },
  iam_roles: { data: [], error: null },
  rbac_audit_logs: { data: [], error: null },
};

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        listUsers: (...args: unknown[]) => {
          listUsersSpy(...args);
          return Promise.resolve({ data: { users: [] }, error: null });
        },
      },
    },
    from: (table: string) => {
      fromSpy(table);
      const state = tableState[table] ?? { data: [], error: null };
      const terminal = Promise.resolve(state);
      const chain = {
        select: () => chain,
        order: () => chain,
        limit: () => terminal,
        then: terminal.then.bind(terminal),
      };
      return chain;
    },
    rpc: (name: string) => {
      rpcSpy(name);
      return { single: () => Promise.resolve({ data: 0, error: null }) };
    },
  }),
}));

// --- Import after mocks ----------------------------------------------------

import { GET } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/iam/audit', { method: 'GET' });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  authState.message = undefined;
});

describe('GET /api/iam/audit', () => {
  it('returns 401 when requireSuperadmin responds ok:false status:401', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 403 when requireSuperadmin responds ok:false status:403', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 200 with snapshot/stats/logs for a valid super_admin', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('snapshot');
    expect(body).toHaveProperty('stats');
    expect(body).toHaveProperty('logs');
    expect(listUsersSpy).toHaveBeenCalled();
    expect(fromSpy).toHaveBeenCalledWith('iam_groups');
    expect(fromSpy).toHaveBeenCalledWith('iam_roles');
    expect(fromSpy).toHaveBeenCalledWith('rbac_audit_logs');
  });

  it('does not enumerate users when auth fails (regression guard for Issue #34)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    // The admin client must never be reached when auth fails — this is the
    // actual CVE regression: previously the handler listed every auth.users
    // row for any unauthenticated caller.
    expect(listUsersSpy).not.toHaveBeenCalled();
    expect(fromSpy).not.toHaveBeenCalled();
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
