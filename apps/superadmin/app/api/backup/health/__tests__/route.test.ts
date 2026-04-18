// Regression tests for Issue #34 — /api/backup/health must require a
// super_admin session before probing storage bucket counts via the admin
// (service_role) client.

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

// --- fs mock ---------------------------------------------------------------

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(() => '{}'),
  readdirSync: jest.fn(() => []),
}));

// --- Admin client mock -----------------------------------------------------

const fromSpy = jest.fn();
const schemaSpy = jest.fn();
const selectSpy = jest.fn();

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => {
    const eq = () => Promise.resolve({ count: 1, error: null });
    const select = (...args: unknown[]) => {
      selectSpy(...args);
      // Terminal for simple .select(...) with no .eq(...): return a thenable
      // that resolves to the count payload. Also expose .eq() for chains
      // that filter by bucket_id / is_active.
      const terminal = Promise.resolve({ count: 1, error: null });
      return {
        eq,
        then: terminal.then.bind(terminal),
      };
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

import { GET } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/backup/health', { method: 'GET' });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
});

describe('GET /api/backup/health', () => {
  it('returns 401 when auth fails with 401', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
    expect(schemaSpy).not.toHaveBeenCalled();
  });

  it('returns 403 when auth fails with 403', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    expect(fromSpy).not.toHaveBeenCalled();
    expect(schemaSpy).not.toHaveBeenCalled();
  });

  it('returns 200 with health snapshot for super_admin', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('healthy');
    expect(body).toHaveProperty('property_photos');
    expect(body).toHaveProperty('property_documents');
    expect(body).toHaveProperty('backup_count');
    expect(fromSpy).toHaveBeenCalledWith('property_photos');
    expect(fromSpy).toHaveBeenCalledWith('property_documents');
    expect(schemaSpy).toHaveBeenCalledWith('storage');
  });

  it('does not probe storage when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
    expect(schemaSpy).not.toHaveBeenCalled();
    expect(selectSpy).not.toHaveBeenCalled();
  });
});
