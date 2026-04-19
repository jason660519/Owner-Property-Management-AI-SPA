// Issue #34 PR D — /api/system-health (GET) must require a super_admin
// session. Previously no-auth, exposing OS stats + disk usage + dev service
// status + DB latency to any unauthenticated caller.

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

const fromSpy = jest.fn();
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      return {
        select: () => ({
          limit: () => Promise.resolve({ error: null, count: 0 }),
        }),
      };
    },
  }),
}));

// Stub global fetch so dev-services probe completes quickly without real
// network. 503 on every probe is fine — the route still returns 200.
const fetchSpy = jest.fn(async () => new Response('', { status: 503 }));
const globalWithFetch = global as unknown as { fetch: typeof fetch };
globalWithFetch.fetch = fetchSpy as unknown as typeof fetch;

import { GET } from '../route';

function req(): NextRequest {
  return new NextRequest('http://localhost:3001/api/system-health', { method: 'GET' });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
});

describe('GET /api/system-health', () => {
  it('returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 403 when auth fails with 403', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 200 with snapshot for super_admin', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('apiServer');
    expect(body).toHaveProperty('database');
    expect(body).toHaveProperty('cpu');
    expect(body).toHaveProperty('memory');
    expect(fromSpy).toHaveBeenCalled();
  });

  it('does not probe DB when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
