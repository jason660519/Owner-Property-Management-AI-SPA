// Unit tests for requireSuperadminOrInternal — dual-track auth (session OR
// INTERNAL_API_KEY bearer token) used by server-callable paperclip routes.

import { NextRequest } from 'next/server';

// Mock the underlying session-based helper. We only need to assert that
// our wrapper delegates to it when the internal-key branch does not match.
const sessionMock = jest.fn();
jest.mock('../require-superadmin', () => ({
  requireSuperadmin: (...args: unknown[]) => sessionMock(...args),
}));

import { requireSuperadminOrInternal } from '../require-superadmin-or-internal';

const TEST_KEY = 'test-internal-key-2026';

function mkReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3001/api/paperclip/test', {
    method: 'POST',
    headers,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('requireSuperadminOrInternal', () => {
  it('returns source=internal when Authorization Bearer matches INTERNAL_API_KEY', async () => {
    const result = await requireSuperadminOrInternal({
      request: mkReq({ authorization: `Bearer ${TEST_KEY}` }),
      internalKeyOverride: TEST_KEY,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe('internal');
      expect(result.userId).toBeNull();
    }
    // Session helper must NOT be called when internal key succeeds.
    expect(sessionMock).not.toHaveBeenCalled();
  });

  it('falls through to session when bearer token does not match', async () => {
    sessionMock.mockResolvedValueOnce({
      ok: true,
      userId: 'admin-1',
      source: 'session',
      viaSession: true,
    });
    const result = await requireSuperadminOrInternal({
      request: mkReq({ authorization: 'Bearer wrong-token' }),
      internalKeyOverride: TEST_KEY,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe('session');
      expect(result.userId).toBe('admin-1');
    }
    expect(sessionMock).toHaveBeenCalledTimes(1);
  });

  it('falls through to session when no Authorization header is present', async () => {
    sessionMock.mockResolvedValueOnce({
      ok: true,
      userId: 'admin-1',
      source: 'session',
      viaSession: true,
    });
    const result = await requireSuperadminOrInternal({
      request: mkReq(),
      internalKeyOverride: TEST_KEY,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source).toBe('session');
    expect(sessionMock).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when neither bearer matches nor session exists', async () => {
    sessionMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      message: 'Unauthorized: missing session or header identity',
    });
    const result = await requireSuperadminOrInternal({
      request: mkReq({ authorization: 'Bearer bogus' }),
      internalKeyOverride: TEST_KEY,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it('returns 403 when session user lacks super_admin role', async () => {
    sessionMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      message: 'Forbidden: super_admin role required',
    });
    const result = await requireSuperadminOrInternal({ request: mkReq() });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it('skips internal-key branch when allowInternalKey=false (session-only route)', async () => {
    sessionMock.mockResolvedValueOnce({
      ok: true,
      userId: 'admin-1',
      source: 'session',
      viaSession: true,
    });
    const result = await requireSuperadminOrInternal({
      request: mkReq({ authorization: `Bearer ${TEST_KEY}` }),
      internalKeyOverride: TEST_KEY,
      allowInternalKey: false,
    });
    // The bearer token was VALID, but allowInternalKey=false forces session path.
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source).toBe('session');
    expect(sessionMock).toHaveBeenCalledTimes(1);
  });

  it('rejects when INTERNAL_API_KEY is empty even if client sends empty bearer', async () => {
    sessionMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      message: 'Unauthorized',
    });
    const result = await requireSuperadminOrInternal({
      request: mkReq({ authorization: 'Bearer ' }),
      internalKeyOverride: '',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('uses constant-time comparison (length mismatch still falls through)', async () => {
    sessionMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      message: 'Unauthorized',
    });
    const result = await requireSuperadminOrInternal({
      request: mkReq({ authorization: 'Bearer short' }),
      internalKeyOverride: 'much-longer-than-the-presented-token',
    });
    expect(result.ok).toBe(false);
    expect(sessionMock).toHaveBeenCalledTimes(1);
  });
});
