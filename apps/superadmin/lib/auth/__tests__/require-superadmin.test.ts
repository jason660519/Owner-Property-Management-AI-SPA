// Tests for lib/auth/require-superadmin.ts. See ai-prompt-safety-guide §6.1.

import { requireSuperadmin } from '../require-superadmin';

// ---------------------------------------------------------------------------
// Module-level mocks: stub out Supabase session + admin clients + resolveUserId
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn<Promise<{ data: { user: { id: string } | null } }>, []>();

jest.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}));

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

const mockResolveUserId = jest.fn<Promise<string | null>, [unknown, string]>();
jest.mock('@/lib/resolve-ai-settings-user', () => ({
  resolveUserId: (client: unknown, id: string) => mockResolveUserId(client, id),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAdminClient(opts: { roles: string[]; rpcError?: string } = { roles: [] }) {
  const rpc = jest.fn().mockResolvedValue(
    opts.rpcError
      ? { data: null, error: { message: opts.rpcError } }
      : {
          data: opts.roles.map((role_name) => ({ role_name })),
          error: null,
        },
  );
  return { rpc, __getRpcCalls: () => rpc.mock.calls } as any;
}

function makeRequest(headers: Record<string, string> = {}): any {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requireSuperadmin', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('accepts a session-authenticated super_admin (no fallback needed)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } } });
    const adminClient = makeAdminClient({ roles: ['super_admin'] });

    const result = await requireSuperadmin({
      request: makeRequest(),
      adminClient,
      routeLabel: 'test-route',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe('u-1');
      expect(result.source).toBe('session');
      expect(result.viaSession).toBe(true);
    }
    // Session path must NOT log the deprecation warning.
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('DEPRECATED'),
      expect.anything(),
    );
  });

  it('rejects 403 when a session user lacks the super_admin role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } } });
    const adminClient = makeAdminClient({ roles: ['landlord'] });

    const result = await requireSuperadmin({
      request: makeRequest(),
      adminClient,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it('falls back to x-user-id header for a super_admin and warns loudly', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockResolveUserId.mockResolvedValue('u-legacy');
    const adminClient = makeAdminClient({ roles: ['super_admin'] });

    const result = await requireSuperadmin({
      request: makeRequest({ 'x-user-id': 'u-legacy' }),
      adminClient,
      routeLabel: 'models/test',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe('u-legacy');
      expect(result.source).toBe('header_fallback');
      expect(result.viaSession).toBe(false);
    }
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('DEPRECATED'),
      expect.objectContaining({ route: 'models/test', headerUserId: 'u-legacy' }),
    );
  });

  it('rejects 403 when header-fallback user lacks super_admin role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockResolveUserId.mockResolvedValue('u-legacy');
    const adminClient = makeAdminClient({ roles: [] });

    const result = await requireSuperadmin({
      request: makeRequest({ 'x-user-id': 'u-legacy' }),
      adminClient,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it('rejects 401 when no session and no header', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const adminClient = makeAdminClient({ roles: [] });

    const result = await requireSuperadmin({
      request: makeRequest(),
      adminClient,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it('rejects 401 when allowHeaderFallback is false and session missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const adminClient = makeAdminClient({ roles: ['super_admin'] });

    const result = await requireSuperadmin({
      request: makeRequest({ 'x-user-id': 'u-1' }),
      adminClient,
      allowHeaderFallback: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it('treats an RPC error on get_user_roles as "not super_admin"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } } });
    const adminClient = makeAdminClient({ roles: [], rpcError: 'boom' });

    const result = await requireSuperadmin({
      request: makeRequest(),
      adminClient,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
    expect(warnSpy).toHaveBeenCalledWith(
      '[require-superadmin] get_user_roles RPC failed',
      expect.objectContaining({ error: 'boom' }),
    );
  });
});
