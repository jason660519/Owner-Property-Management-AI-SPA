// Regression tests for Issue #31 — /api/supabase/sql must require a
// super_admin session before running any SQL via the admin (service_role)
// client. Historically this endpoint was reachable without a cookie because
// middleware.ts's matcher does not cover /api/*.

import { NextRequest } from 'next/server';

// --- Mocks -----------------------------------------------------------------

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
  message?: string;
  userId?: string;
}

const authState: AuthState = { ok: true, userId: 'admin-1' };

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(async () => {
    if (authState.ok) {
      return {
        ok: true,
        userId: authState.userId ?? 'admin-1',
        source: 'session' as const,
        viaSession: true,
      };
    }
    return {
      ok: false,
      status: authState.status ?? 401,
      message: authState.message ?? 'Unauthorized',
    };
  }),
}));

interface QueryResult {
  data: unknown[] | null;
  error: null | { message: string };
}
const queryResult: QueryResult = { data: [], error: null };

const fromSpy = jest.fn();
const schemaSpy = jest.fn();
const selectSpy = jest.fn();
const limitSpy = jest.fn();

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => {
    // Chainable stub: admin.from(t).select(c).limit(n)
    // or admin.schema(s).from(t).select(c).limit(n)
    const limit = (n: number) => {
      limitSpy(n);
      return Promise.resolve({ data: queryResult.data, error: queryResult.error });
    };
    const select = (cols: string) => {
      selectSpy(cols);
      return { limit };
    };
    const from = (table: string) => {
      fromSpy(table);
      return { select };
    };
    const schema = (name: string) => {
      schemaSpy(name);
      return { from };
    };
    return { from, schema };
  },
}));

// --- Import after mocks ----------------------------------------------------

import { POST } from '../route';

// --- Helpers ---------------------------------------------------------------

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/supabase/sql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  authState.message = undefined;
  authState.userId = 'admin-1';
  queryResult.data = [];
  queryResult.error = null;
});

// ---------------------------------------------------------------------------

describe('POST /api/supabase/sql', () => {
  it('returns 401 when requireSuperadmin responds ok:false status:401', async () => {
    authState.ok = false;
    authState.status = 401;

    const res = await POST(postReq({ query: 'SELECT id FROM platform_settings LIMIT 1' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 403 when requireSuperadmin responds ok:false status:403', async () => {
    authState.ok = false;
    authState.status = 403;

    const res = await POST(postReq({ query: 'SELECT id FROM platform_settings LIMIT 1' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 200 with rows for a valid SELECT by super_admin', async () => {
    queryResult.data = [{ id: '11111111-1111-1111-1111-111111111111' }];

    const res = await POST(postReq({ query: 'SELECT id FROM platform_settings LIMIT 1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rowCount).toBe(1);
    expect(body.rows).toEqual([{ id: '11111111-1111-1111-1111-111111111111' }]);
    expect(body.table).toBe('public.platform_settings');
    // Admin client must be invoked only after auth passes.
    expect(fromSpy).toHaveBeenCalledWith('platform_settings');
    expect(selectSpy).toHaveBeenCalled();
    expect(limitSpy).toHaveBeenCalled();
  });

  it('returns 400 when body contains INSERT (forbidden SQL kept after auth passes)', async () => {
    const res = await POST(
      postReq({ query: "INSERT INTO platform_settings (id) VALUES ('x')" }),
    );
    expect(res.status).toBe(400);
    // Forbidden SQL must never reach the admin client.
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 400 when body is empty', async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('does not query the database when auth fails (regression guard for Issue #31)', async () => {
    authState.ok = false;
    authState.status = 401;

    const res = await POST(postReq({ query: 'SELECT id FROM platform_settings LIMIT 1' }));
    expect(res.status).toBe(401);
    // The admin client must never be reached when auth fails — this is the
    // actual CVE regression: previously the handler queried the DB first.
    expect(fromSpy).not.toHaveBeenCalled();
    expect(schemaSpy).not.toHaveBeenCalled();
    expect(selectSpy).not.toHaveBeenCalled();
    expect(limitSpy).not.toHaveBeenCalled();
  });
});
