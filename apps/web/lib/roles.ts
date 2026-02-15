export type CanonicalRole =
  | 'landlord'
  | 'contracted_tenant'
  | 'potential_tenant'
  | 'contracted_buyer'
  | 'potential_buyer'
  | 'agent'
  | 'service_provider'
  | 'super_admin';

// Map many possible incoming role strings (from app_metadata, user_metadata, cookies, middleware, etc.)
// to the canonical role keys used across `ROLE_METADATA` and route params.
const NORMALIZATION_MAP: Record<string, CanonicalRole> = {
  // landlord
  landlord: 'landlord',

  // tenant variants
  tenant: 'contracted_tenant',
  'tenant/contracted': 'contracted_tenant',
  'tenant/contracted_dashboard': 'contracted_tenant',
  contracted_tenant: 'contracted_tenant',
  contract_tenant: 'contracted_tenant',

  'tenant/potential': 'potential_tenant',
  potential_tenant: 'potential_tenant',
  'tenant/potential_dashboard': 'potential_tenant',

  // buyer variants
  buyer: 'contracted_buyer',
  'buyer/contracted': 'contracted_buyer',
  contracted_buyer: 'contracted_buyer',
  contract_buyer: 'contracted_buyer',

  'buyer/potential': 'potential_buyer',
  potential_buyer: 'potential_buyer',

  // agent
  agent: 'agent',

  // service provider / vendor
  'service-provider': 'service_provider',
  service_provider: 'service_provider',
  serviceprovider: 'service_provider',
  vendor: 'service_provider',

  // super admin
  super_admin: 'super_admin',
  superadmin: 'super_admin',
  'super-admin': 'super_admin',
};

export function canonicalizeRole(raw?: string | null): CanonicalRole | null {
  if (!raw || typeof raw !== 'string') return null;
  const key = raw.trim().toLowerCase();
  return NORMALIZATION_MAP[key] ?? null;
}

/**
 * Normalize roles from API (string[] or { role_name?: string }[]) to string[].
 * Use so login/middleware always work with a flat list of role names.
 */
export function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: unknown) => {
      if (typeof r === 'string') return r;
      if (r && typeof r === 'object' && 'role_name' in r) return String((r as { role_name?: string }).role_name ?? '');
      if (r && typeof r === 'object' && 'role' in r) return String((r as { role?: string }).role ?? '');
      return String(r);
    })
    .filter(Boolean);
}
