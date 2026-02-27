import type { SupabaseClient } from '@supabase/supabase-js';
import type { ResourceId } from './resources';

// Scope determines how broadly a permission applies
export type PermissionScope = 'all' | 'own' | 'assigned';

// Call the check_user_permission DB function to determine the user's scope
export async function checkUserHasPermission(
  supabase: SupabaseClient,
  userId: string,
  resource: ResourceId | string,
  action: string
): Promise<PermissionScope | null> {
  const { data, error } = await supabase.rpc('check_user_permission', {
    p_user_id: userId,
    p_resource: resource,
    p_action: action,
  });

  if (error) {
    console.error('check_user_permission RPC error:', error);
    return null;
  }

  return (data as PermissionScope | null) ?? null;
}

// Route → required resource + action mapping (21 routes)
export interface RoutePermission {
  resource: ResourceId | string;
  action: string;
}

export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  '/superadmin/dashboard/iam-management':              { resource: 'iam_users',         action: 'read' },
  '/superadmin/dashboard/rbac_access_control':         { resource: 'iam_roles_groups',  action: 'manage' },
  '/superadmin/dashboard/role_access_matrix':          { resource: 'iam_roles_groups',  action: 'read' },
  '/superadmin/role-simulation':                       { resource: 'iam_roles_groups',  action: 'manage' },
  '/superadmin/properties':                            { resource: 'rental_properties', action: 'read' },
  '/superadmin/leases':                                { resource: 'lease_contracts',   action: 'read' },
  '/superadmin/dashboard/supabase':                    { resource: 'system_config',     action: 'read' },
  '/superadmin/dashboard/storage':                     { resource: 'storage',           action: 'read' },
  '/superadmin/dashboard/behavior-monitoring':         { resource: 'audit_trails',      action: 'read' },
  '/superadmin/dashboard/performance':                 { resource: 'system_logs',       action: 'read' },
  '/superadmin/dashboard/llm-monitor':                 { resource: 'ai_services',       action: 'read' },
  '/superadmin/dashboard/project-progress':            { resource: 'system_logs',       action: 'read' },
  '/superadmin/docs':                                  { resource: 'system_config',     action: 'read' },
  '/superadmin/settings/api_key_and_model_setting':    { resource: 'ai_services',       action: 'manage' },
  '/superadmin/settings':                              { resource: 'system_config',     action: 'manage' },
  '/superadmin/logs':                                  { resource: 'audit_trails',      action: 'read' },
  '/superadmin/finance/rental':                        { resource: 'rental_ledger',     action: 'read' },
  '/superadmin/finance/sales':                         { resource: 'sales_ledger',      action: 'read' },
  '/superadmin/finance/bank':                          { resource: 'bank_accounts',     action: 'read' },
  '/superadmin/buildings':                             { resource: 'buildings',         action: 'read' },
  '/superadmin/contracts/agent':                       { resource: 'agent_authorizations', action: 'read' },
};

// Find the most-specific matching route permission using longest prefix match
export function findRoutePermission(pathname: string): RoutePermission | null {
  let bestMatch: string | null = null;

  for (const route of Object.keys(ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      if (bestMatch === null || route.length > bestMatch.length) {
        bestMatch = route;
      }
    }
  }

  return bestMatch ? ROUTE_PERMISSIONS[bestMatch] : null;
}

// Returns hrefs the user can access.
// super_admin: all routes
// others: filter by checkUserHasPermission
export async function getAccessibleRoutes(
  supabase: SupabaseClient,
  userId: string,
  isSuperAdmin: boolean,
  allRoutes: string[]
): Promise<string[]> {
  if (isSuperAdmin) return allRoutes;

  const checks = await Promise.all(
    allRoutes.map(async (href) => {
      const perm = findRoutePermission(href);
      if (!perm) return href; // no restriction defined → accessible
      const scope = await checkUserHasPermission(supabase, userId, perm.resource, perm.action);
      return scope !== null ? href : null;
    })
  );

  return checks.filter((h): h is string => h !== null);
}
