// Issue #34 PR D — /api/transcript-parse/local (POST) must require a
// super_admin session. Previously no-auth. Route triggers Python CLI / HTTP
// calls against OCR service with Supabase-downloaded PDF content.

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
          eq: () => ({
            single: () => Promise.resolve({ data: { file_path: 'path.pdf' }, error: null }),
          }),
        }),
      };
    },
    storage: {
      from: () => ({
        download: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
      }),
    },
  }),
}));

import { POST } from '../route';

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/transcript-parse/local', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  delete process.env.OCR_LOCAL_DIR;
  delete process.env.OCR_LOCAL_URL;
});

describe('POST /api/transcript-parse/local', () => {
  it('returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(makeReq({ documentId: 'doc-1' }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 403 when auth fails with 403', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await POST(makeReq({ documentId: 'doc-1' }));
    expect(res.status).toBe(403);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 400 when documentId missing (after auth)', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('regression guard: admin client is not touched when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(makeReq({ documentId: 'doc-1' }));
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
