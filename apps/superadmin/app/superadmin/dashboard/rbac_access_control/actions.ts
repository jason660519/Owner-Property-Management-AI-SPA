'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

const BASE = '/superadmin/dashboard/rbac_access_control';

export interface Role {
  id: string;
  name: string;
  description: string;
  parent_role_id: string | null;
  created_at: string;
}

export interface RbacAuditLog {
  id: string;
  role_id: string | null;
  role_name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'REVOKE';
  actor_email: string | null;
  changes: Record<string, unknown>;
  created_at: string;
}

/** Write an audit log entry for RBAC changes */
async function writeAuditLog(
  roleId: string | null,
  roleName: string,
  action: RbacAuditLog['action'],
  actorEmail: string | null,
  changes: Record<string, unknown>
) {
  const admin = createAdminClient();
  await admin.from('rbac_audit_logs').insert({
    role_id: roleId,
    role_name: roleName,
    action,
    actor_email: actorEmail,
    changes,
  });
}

export async function getRoles(): Promise<Role[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('iam_roles')
    .select('id, name, description, parent_role_id, created_at')
    .order('name');

  if (error) throw error;
  return (data as Role[]) ?? [];
}

export async function getRbacAuditLogs(limit = 50): Promise<RbacAuditLog[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('rbac_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching RBAC audit logs:', error);
    return [];
  }
  return (data as RbacAuditLog[]) ?? [];
}

/** Check if any users are assigned to this role */
export async function checkRoleUsers(roleId: string): Promise<number> {
  const admin = createAdminClient();
  // Check iam_user_roles if exists, fallback to group memberships
  const { count } = await admin
    .from('iam_user_group_memberships')
    .select('user_id', { count: 'exact', head: true })
    .eq('group_id', roleId);
  return count ?? 0;
}

export async function deleteRole(
  roleId: string,
  roleName: string,
  actorEmail?: string
): Promise<{ success?: boolean; error?: string; hasUsers?: boolean }> {
  // Check for assigned users before deletion
  const userCount = await checkRoleUsers(roleId);
  if (userCount > 0) {
    return {
      error: `此角色仍有 ${userCount} 位用戶指派，請先移除指派後再刪除。`,
      hasUsers: true,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('iam_roles').delete().eq('id', roleId);

  if (error) return { error: error.message };

  // Write audit log
  await writeAuditLog(null, roleName, 'DELETE', actorEmail ?? null, { deleted_role_id: roleId });

  revalidatePath(BASE);
  return { success: true };
}

export async function createRole(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const parentRoleId = (formData.get('parent_role_id') as string) || null;
  const actorEmail = (formData.get('actor_email') as string) || null;

  if (!name) return { error: 'Name is required' };

  const { data, error } = await supabase
    .from('iam_roles')
    .insert({ name, description, parent_role_id: parentRoleId })
    .select('id')
    .single();

  if (error) return { error: error.message };

  // Write audit log
  await writeAuditLog(data?.id ?? null, name, 'CREATE', actorEmail, { name, description, parent_role_id: parentRoleId });

  revalidatePath(BASE);
  return { success: true };
}

// --- Role Permissions ---

export interface RolePermission {
  role_id: string;
  resource: string;
  actions: string[];
  scope: 'all' | 'own' | 'assigned';
}

export async function getAllRolePermissions(): Promise<RolePermission[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('iam_role_permissions')
    .select('role_id, resource, actions, scope');

  if (error) {
    console.error('Error fetching all role permissions:', error);
    return [];
  }
  return (data as RolePermission[]) ?? [];
}

export async function getRolePermissions(roleId: string): Promise<RolePermission[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('iam_role_permissions')
    .select('role_id, resource, actions')
    .eq('role_id', roleId);

  if (error) {
    console.error('Error fetching role permissions:', error);
    return [];
  }
  return (data as RolePermission[]) ?? [];
}

export async function saveRolePermissions(
  roleId: string,
  permissions: { resource: string; actions: string[]; scope?: 'all' | 'own' | 'assigned' }[]
): Promise<{ success?: boolean; error?: string }> {
  const admin = createAdminClient();

  // Upsert each resource permission
  const rows = permissions.map(p => ({
    role_id: roleId,
    resource: p.resource,
    actions: p.actions,
    scope: p.scope ?? 'all',
  }));

  if (rows.length === 0) {
    // Delete all permissions for this role if empty
    const { error } = await admin
      .from('iam_role_permissions')
      .delete()
      .eq('role_id', roleId);
    if (error) return { error: error.message };
    return { success: true };
  }

  const { error } = await admin
    .from('iam_role_permissions')
    .upsert(rows, { onConflict: 'role_id,resource' });

  if (error) return { error: error.message };

  // Remove resources not in the new list
  const resourcesKept = rows.map(r => r.resource);
  await admin
    .from('iam_role_permissions')
    .delete()
    .eq('role_id', roleId)
    .not('resource', 'in', `(${resourcesKept.map(r => `"${r}"`).join(',')})`);

  revalidatePath(BASE);
  return { success: true };
}

export async function updateRole(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const parentRoleId = (formData.get('parent_role_id') as string) || null;
  const actorEmail = (formData.get('actor_email') as string) || null;

  if (!id || !name) return { error: 'ID and Name are required' };

  const { error } = await supabase
    .from('iam_roles')
    .update({ name, description, parent_role_id: parentRoleId })
    .eq('id', id);

  if (error) return { error: error.message };

  // Write audit log
  await writeAuditLog(id, name, 'UPDATE', actorEmail, { name, description, parent_role_id: parentRoleId });

  revalidatePath(BASE);
  return { success: true };
}
