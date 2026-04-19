// Issue #34 PR C — /api/paperclip/cron/run (POST) must require session OR
// INTERNAL_API_KEY. Used by scheduled-tasks MCP to trigger agent-health etc.

import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
  source?: 'session' | 'internal';
  userId?: string | null;
}
const authState: AuthState = { ok: true, source: 'session', userId: 'admin-1' };

jest.mock('@/lib/auth/require-superadmin-or-internal', () => ({
  requireSuperadminOrInternal: jest.fn(async () => {
    if (authState.ok) {
      return { ok: true, source: authState.source ?? 'session', userId: authState.userId ?? null };
    }
    return { ok: false, status: authState.status ?? 401, message: 'denied' };
  }),
}));

const fromSpy = jest.fn();
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      const eq = () => Promise.resolve({ error: null });
      const update = () => ({ eq });
      const insert = () => Promise.resolve({ error: null });
      return { update, insert };
    },
  }),
}));

const fetchSpy = jest.fn(
  async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
);
const globalWithFetch = global as unknown as { fetch: typeof fetch };
globalWithFetch.fetch = fetchSpy as unknown as typeof fetch;

import { POST } from '../route';

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/paperclip/cron/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  authState.source = 'session';
  authState.userId = 'admin-1';
});

describe('POST /api/paperclip/cron/run', () => {
  it('returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(postReq({ job_type: 'agent_health' }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 200 via internal key and forwards INTERNAL_API_KEY to downstream', async () => {
    authState.source = 'internal';
    authState.userId = null;
    process.env.INTERNAL_API_KEY = 'test-key';
    const res = await POST(postReq({ job_type: 'agent_health' }));
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalled();
    const fetchCall = fetchSpy.mock.calls[0] as unknown as [string, { headers?: Record<string, string> }];
    const init = fetchCall[1];
    expect(init?.headers?.Authorization).toBe('Bearer test-key');
  });

  it('returns 200 via session', async () => {
    const res = await POST(postReq({ job_type: 'work_summary' }));
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid job_type (after auth passes)', async () => {
    const res = await POST(postReq({ job_type: 'bogus' }));
    expect(res.status).toBe(400);
  });
});
