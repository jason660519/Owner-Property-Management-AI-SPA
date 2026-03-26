// filepath: apps/web-au/lib/roles.ts
export type CanonicalRole =
  | 'landlord'
  | 'contracted_tenant'
  | 'potential_tenant'
  | 'contracted_buyer'
  | 'potential_buyer'
  | 'agent'
  | 'service_provider'
  | 'super_admin';

const NORMALIZATION_MAP: Record<string, CanonicalRole> = {
  landlord: 'landlord',
  tenant: 'contracted_tenant',
  contracted_tenant: 'contracted_tenant',
  potential_tenant: 'potential_tenant',
  buyer: 'contracted_buyer',
  contracted_buyer: 'contracted_buyer',
  potential_buyer: 'potential_buyer',
  agent: 'agent',
  service_provider: 'service_provider',
  super_admin: 'super_admin',
};

export function canonicalizeRole(raw?: string | null): CanonicalRole | null {
  if (!raw || typeof raw !== 'string') return null;
  const key = raw.trim().toLowerCase();
  return NORMALIZATION_MAP[key] ?? null;
}

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
