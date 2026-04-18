// Regression tests for Issue #34 — /api/backup/restore must require a
// super_admin session before upserting rows via the admin (service_role)
// client. Without the guard, any unauthenticated POST could trigger a full
// data restore from a file whose id matches the naming pattern.

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

// --- fs mock ---------------------------------------------------------------

const backupPayload = {
  version: '2.0',
  data: {
    property_photos: [{ id: 'p1' }],
  },
};
const fsState = { exists: true };

jest.mock('fs', () => ({
  existsSync: jest.fn(() => fsState.exists),
  readFileSync: jest.fn(() => JSON.stringify(backupPayload)),
  readdirSync: jest.fn(() => []),
}));

// --- Admin client mock -----------------------------------------------------

const upsertSpy = jest.fn();
const fromSpy = jest.fn();
const schemaSpy = jest.fn();

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => {
    const upsert = (...args: unknown[]) => {
      upsertSpy(...args);
      return Promise.resolve({ error: null });
    };
    const from = (table: string) => {
      fromSpy(table);
      return { upsert };
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

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/backup/restore', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  fsState.exists = true;
});

describe('POST /api/backup/restore', () => {
  it('returns 401 when requireSuperadmin responds ok:false status:401', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(postReq({ id: 'backup_20260419_120000' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 403 when requireSuperadmin responds ok:false status:403', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await POST(postReq({ id: 'backup_20260419_120000' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 200 and upserts rows for a valid backup id by super_admin', async () => {
    const res = await POST(postReq({ id: 'backup_20260419_120000' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('restored');
    expect(fromSpy).toHaveBeenCalledWith('property_photos');
    expect(upsertSpy).toHaveBeenCalled();
  });

  it('returns 400 when backup id does not match pattern', async () => {
    const res = await POST(postReq({ id: 'not-a-valid-id' }));
    expect(res.status).toBe(400);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('returns 404 when backup file is missing', async () => {
    fsState.exists = false;
    const res = await POST(postReq({ id: 'backup_20260419_120000' }));
    expect(res.status).toBe(404);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('does not restore when auth fails (regression guard for Issue #34)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(postReq({ id: 'backup_20260419_120000' }));
    expect(res.status).toBe(401);
    // The admin client must never be reached when auth fails — previously
    // any caller could trigger a full database restore.
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(fromSpy).not.toHaveBeenCalled();
    expect(schemaSpy).not.toHaveBeenCalled();
  });
});
