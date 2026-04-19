// Issue #34 PR C — /api/paperclip/task-queue (GET + POST) guarded by
// requireSuperadminOrInternal.

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
      const terminal = Promise.resolve({ data: [], error: null });
      const chain = {
        select: () => chain,
        order: () => chain,
        eq: () => chain,
        in: () => chain,
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: '1' }, error: null }) }) }),
        then: terminal.then.bind(terminal),
      };
      return chain;
    },
  }),
}));

import { GET, POST } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/paperclip/task-queue', { method: 'GET' });
}
function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/paperclip/task-queue', {
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

describe('/api/paperclip/task-queue', () => {
  it('GET returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('GET returns 200 via internal key', async () => {
    authState.source = 'internal';
    authState.userId = null;
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('paperclip_tasks');
  });

  it('POST returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(postReq({ rowId: '001', issueId: 'x', issueUrl: 'y' }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('POST returns 200 via session', async () => {
    const res = await POST(postReq({ rowId: '001', issueId: 'x', issueUrl: 'y' }));
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('paperclip_tasks');
  });

  it('POST returns 400 for missing required fields (after auth passes)', async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
  });
});
