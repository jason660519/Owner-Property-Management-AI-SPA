// Issue #34 PR G — /api/dev-tasks/next (GET) is dual-track: superadmin
// session OR INTERNAL_API_KEY bearer. Primary caller is the local-agent
// polling loop at tools/local-agent/dev-tasks-agent.ts.

import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
  source?: 'session' | 'internal';
  userId?: string | null;
}
const authState: AuthState = { ok: true, source: 'internal', userId: null };

jest.mock('@/lib/auth/require-superadmin-or-internal', () => ({
  requireSuperadminOrInternal: jest.fn(async () => {
    if (authState.ok) {
      return { ok: true, source: authState.source ?? 'internal', userId: authState.userId ?? null };
    }
    return { ok: false, status: authState.status ?? 401, message: 'denied' };
  }),
}));

const fromSpy = jest.fn();

const nextTask: { data: unknown; error: null | { message: string } } = {
  data: {
    id: 'task-1',
    user_id: 'u1',
    row_id: 'R01',
    feature_name: 'feat',
    ide: 'Cursor',
    prompt: 'hi',
    metadata: {},
    status: 'queued',
  },
  error: null,
};

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      const maybeSingle = () => Promise.resolve(nextTask);
      const limit = () => ({ maybeSingle });
      const order = () => ({ limit });
      const select = () => ({ eq: () => ({ eq: () => ({ order }) }) });
      const update = () => ({ eq: () => Promise.resolve({ error: null }) });
      return { select, update };
    },
  }),
}));

import { GET } from '../route';

function req(ide: string | null = 'Cursor'): NextRequest {
  const base = 'http://localhost:3001/api/dev-tasks/next';
  const url = ide ? `${base}?ideType=${encodeURIComponent(ide)}` : base;
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  authState.source = 'internal';
  authState.userId = null;
  nextTask.data = {
    id: 'task-1',
    user_id: 'u1',
    row_id: 'R01',
    feature_name: 'feat',
    ide: 'Cursor',
    prompt: 'hi',
    metadata: {},
    status: 'queued',
  };
  nextTask.error = null;
});

describe('GET /api/dev-tasks/next', () => {
  it('returns 401 when auth fails (no session, no valid key)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 403 when session lacks super_admin role', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 200 via internal key (local-agent polling)', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.task?.id).toBe('task-1');
    expect(fromSpy).toHaveBeenCalledWith('dev_tasks');
  });

  it('returns 200 via session (manual UI trigger)', async () => {
    authState.source = 'session';
    authState.userId = 'admin-1';
    const res = await GET(req());
    expect(res.status).toBe(200);
  });

  it('returns 400 when ideType missing (after auth)', async () => {
    const res = await GET(req(null));
    expect(res.status).toBe(400);
  });
});
