/**
 * Tests for /portal/[role] redirect page
 *
 * Verifies that:
 * 1. Canonical role keys redirect to the correct dashboard path
 * 2. Alias role strings are normalized and redirect correctly
 * 3. Unknown roles fall back to /portal
 * 4. super_admin redirects to the external superadmin URL
 */
import { redirect } from 'next/navigation';
import { ROLE_METADATA } from '@/config/roles';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Import after mocks
import RoleRedirectPage from '../page';

describe('/portal/[role] redirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper: build a params Promise like Next.js 16 does
  const mkParams = (role: string) => Promise.resolve({ role });

  it.each([
    ['landlord', '/landlord/dashboard'],
    ['contracted_tenant', '/tenant/contracted/dashboard'],
    ['potential_tenant', '/tenant/potential/dashboard'],
    ['contracted_buyer', '/buyer/contracted/dashboard'],
    ['potential_buyer', '/buyer/potential/dashboard'],
    ['agent', '/agent/dashboard'],
    ['service_provider', '/service-provider/dashboard'],
  ])(
    'redirects canonical role "%s" to %s',
    async (role, expectedPath) => {
      await RoleRedirectPage({ params: mkParams(role) });
      expect(redirect).toHaveBeenCalledWith(expectedPath);
    },
  );

  it.each([
    ['tenant', '/tenant/contracted/dashboard'],
    ['tenant/contracted', '/tenant/contracted/dashboard'],
    ['contract_tenant', '/tenant/contracted/dashboard'],
    ['buyer', '/buyer/contracted/dashboard'],
    ['buyer/potential', '/buyer/potential/dashboard'],
    ['service-provider', '/service-provider/dashboard'],
    ['serviceprovider', '/service-provider/dashboard'],
    ['vendor', '/service-provider/dashboard'],
    ['superadmin', expect.stringContaining('/superadmin/dashboard')],
    ['super-admin', expect.stringContaining('/superadmin/dashboard')],
  ])(
    'normalizes alias "%s" and redirects correctly',
    async (alias, expectedPath) => {
      await RoleRedirectPage({ params: mkParams(alias) });
      expect(redirect).toHaveBeenCalledWith(expectedPath);
    },
  );

  it('falls back to /portal for unknown roles', async () => {
    await RoleRedirectPage({ params: mkParams('unknown_xyz') });
    expect(redirect).toHaveBeenCalledWith('/portal');
  });

  it('redirects super_admin to external URL', async () => {
    await RoleRedirectPage({ params: mkParams('super_admin') });
    const url = (redirect as unknown as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/superadmin/dashboard');
    // Should include the port 3001 URL
    expect(url).toMatch(/localhost:3001|NEXT_PUBLIC_SUPERADMIN_URL/);
  });
});
