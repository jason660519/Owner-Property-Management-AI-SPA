// Issue #34 PR D — /api/documents/upload-condition-pdf (POST) must require a
// super_admin session. Previously was completely no-auth, letting anyone
// upload PDFs into the property-documents storage bucket.
//
// This test focuses on the auth guard — happy-path upload goes through
// `request.formData()` which is not exercised in jest's undici-backed
// NextRequest (multipart parsing differs). That path is covered by the
// upload page's own integration tests.

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

const uploadSpy = jest.fn();

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => {
          uploadSpy(...args);
          return Promise.resolve({ error: null });
        },
      }),
    },
  }),
}));

import { POST } from '../route';

function emptyReq(): NextRequest {
  return new NextRequest('http://localhost:3001/api/documents/upload-condition-pdf', {
    method: 'POST',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
});

describe('POST /api/documents/upload-condition-pdf', () => {
  it('returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(emptyReq());
    expect(res.status).toBe(401);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('returns 403 when auth fails with 403', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await POST(emptyReq());
    expect(res.status).toBe(403);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('regression guard: storage.upload is never called when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    await POST(emptyReq());
    expect(uploadSpy).not.toHaveBeenCalled();
  });
});
