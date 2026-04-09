import { canonicalizeRole } from '../roles';

describe('canonicalizeRole', () => {
  it('normalizes common aliases to canonical role keys', () => {
    expect(canonicalizeRole('tenant')).toBe('contracted_tenant');
    expect(canonicalizeRole('tenant/contracted')).toBe('contracted_tenant');
    expect(canonicalizeRole('contract_tenant')).toBe('contracted_tenant');
    expect(canonicalizeRole('buyer')).toBe('contracted_buyer');
    expect(canonicalizeRole('buyer/potential')).toBe('potential_buyer');
    expect(canonicalizeRole('service-provider')).toBe('service_provider');
    expect(canonicalizeRole('superadmin')).toBe('super_admin');
    expect(canonicalizeRole('landlord')).toBe('landlord');
  });

  it('returns null for unknown/empty values', () => {
    expect(canonicalizeRole('')).toBeNull();
    expect(canonicalizeRole(null as unknown as string)).toBeNull();
    expect(canonicalizeRole('unknown_role')).toBeNull();
  });
});
