// Issue #34 PR D — /api/dev-tasks (GET + POST) migrated off legacy
// x-user-id header to session-based auth.

import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
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
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'task-1', status: 'queued' }, error: null }),
          }),
        }),
        then: terminal.then.bind(terminal),
      };
      return chain;
    },
  }),
}));

import { GET, POST } from '../route';

function getReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/dev-tasks', { method: 'GET' });
}
function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/dev-tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
});

describe('/api/dev-tasks', () => {
  it('GET returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('GET returns 200 and lists tasks for super_admin', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('dev_tasks');
  });

  it('POST returns 401 when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(
      postReq({
        rowId: 'R01',
        featureName: 'feat',
        ide: 'Cursor',
        prompt: 'hello',
      }),
    );
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('POST returns 201 when all fields valid and auth passes', async () => {
    const res = await POST(
      postReq({
        rowId: 'R01',
        featureName: 'feat',
        ide: 'Cursor',
        prompt: 'hello',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.taskId).toBe('task-1');
  });

  it('POST returns 400 when required fields missing', async () => {
    const res = await POST(postReq({ ide: 'Cursor' }));
    expect(res.status).toBe(400);
  });
});
