// Issue #34 PR C — /api/paperclip/task-queue/claim (POST) is session-ONLY
// (allowInternalKey: false) because claimed_by must be a real user.

import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
  userId?: string;
}
const authState: AuthState = { ok: true, userId: 'admin-1' };

jest.mock('@/lib/auth/require-superadmin-or-internal', () => ({
  requireSuperadminOrInternal: jest.fn(async (opts: { allowInternalKey?: boolean }) => {
    // Route passes allowInternalKey:false — session only.
    if (opts?.allowInternalKey === false) {
      if (authState.ok) {
        return { ok: true, source: 'session', userId: authState.userId ?? 'admin-1' };
      }
      return { ok: false, status: authState.status ?? 401, message: 'denied' };
    }
    // Fallback — should not be reached from claim, but keep the mock safe.
    return { ok: true, source: 'internal', userId: null };
  }),
}));

jest.mock('@/lib/agent-runtime', () => ({
  getAgentRuntime: () => ({ ok: false, status: 500, error: 'no runtime' }),
}));

const fromSpy = jest.fn();

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      const maybeSingleFirst = () =>
        Promise.resolve({
          data: { id: 't1', claimed_by: null, row_id: '001', issue_id: 'i1', assigned_agent: 'a1' },
          error: null,
        });
      const selectUpdate = () => ({ maybeSingle: () => Promise.resolve({ data: { id: 't1' }, error: null }) });
      const chain = {
        select: () => ({
          eq: () => ({
            in: () => ({ maybeSingle: maybeSingleFirst }),
          }),
        }),
        update: () => ({
          eq: () => ({
            is: () => ({
              select: selectUpdate,
            }),
          }),
        }),
      };
      return chain;
    },
  }),
}));

import { POST } from '../route';

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/paperclip/task-queue/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  authState.userId = 'admin-1';
});

describe('POST /api/paperclip/task-queue/claim', () => {
  it('returns 401 when session is missing (internal key NOT accepted here)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(req({ rowId: '001' }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 403 when session lacks super_admin role', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await POST(req({ rowId: '001' }));
    expect(res.status).toBe(403);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 200 via session (valid super_admin claims the task)', async () => {
    const res = await POST(req({ rowId: '001' }));
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('paperclip_tasks');
  });

  it('returns 400 when rowId missing', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });
});
