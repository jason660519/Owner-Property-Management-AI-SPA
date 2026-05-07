'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { validateParentRoleSelection } from './rbac-parent-validation';

const BASE = '/superadmin/dashboard/rbac_access_control';
const IAM_MANAGEMENT = '/superadmin/dashboard/iam-management';

function revalidateRbacViews() {
  revalidatePath(BASE);
  revalidatePath(IAM_MANAGEMENT);
}

async function getActorEmailFromSession(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

function mapUniqueViolation(message: string, code?: string): string | null {
  if (code === '23505' || message.includes('duplicate key') || message.includes('23505')) {
    return '此角色名稱已存在，請使用不重複的名稱。';
  }
  return null;
}

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

/**
 * Distinct users that hold this role directly or via a group that attaches the role.
 */
export async function getAssignedUserCountForRole(
  roleId: string
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const admin = createAdminClient();

  const { data: directRows, error: e1 } = await admin
    .from('iam_user_roles')
    .select('user_id')
    .eq('role_id', roleId);

  if (e1) {
    console.error('getAssignedUserCountForRole iam_user_roles:', e1);
    return { ok: false, message: e1.message };
  }

  const userIds = new Set<string>((directRows ?? []).map(r => String(r.user_id)));

  const { data: groupLinks, error: e2 } = await admin
    .from('iam_group_roles')
    .select('group_id')
    .eq('role_id', roleId);

  if (e2) {
    console.error('getAssignedUserCountForRole iam_group_roles:', e2);
    return { ok: false, message: e2.message };
  }

  const groupIds = (groupLinks ?? []).map(g => String(g.group_id));
  if (groupIds.length > 0) {
    const { data: memberRows, error: e3 } = await admin
      .from('iam_group_members')
      .select('user_id')
      .in('group_id', groupIds);

    if (e3) {
      console.error('getAssignedUserCountForRole iam_group_members:', e3);
      return { ok: false, message: e3.message };
    }
    for (const row of memberRows ?? []) {
      userIds.add(String(row.user_id));
    }
  }

  return { ok: true, count: userIds.size };
}

export async function deleteRole(
  roleId: string,
  roleName: string,
  actorEmail?: string
): Promise<{ success?: boolean; error?: string; hasUsers?: boolean }> {
  const assigned = await getAssignedUserCountForRole(roleId);
  if (!assigned.ok) {
    return {
      error: '無法確認角色是否仍有用戶指派，請稍後重試。',
    };
  }
  if (assigned.count > 0) {
    return {
      error: `此角色仍有 ${assigned.count} 位用戶指派（含透過群組附帶的角色），請先移除指派後再刪除。`,
      hasUsers: true,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('iam_roles').delete().eq('id', roleId);

  if (error) return { error: error.message };

  const resolvedActor = actorEmail ?? (await getActorEmailFromSession());
  await writeAuditLog(null, roleName, 'DELETE', resolvedActor, { deleted_role_id: roleId });

  revalidateRbacViews();
  return { success: true };
}

export async function createRole(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const parentRoleId = (formData.get('parent_role_id') as string) || null;
  const actorEmail =
    (formData.get('actor_email') as string) || (await getActorEmailFromSession());

  if (!name) return { error: 'Name is required' };

  const parentErr = await validateParentRoleSelection(
    null,
    parentRoleId,
    async rid => {
      const { data } = await supabase.from('iam_roles').select('parent_role_id').eq('id', rid).maybeSingle();
      return (data?.parent_role_id as string | null) ?? null;
    }
  );
  if (parentErr) return { error: parentErr };

  const { data, error } = await supabase
    .from('iam_roles')
    .insert({ name, description, parent_role_id: parentRoleId })
    .select('id')
    .single();

  if (error) {
    const friendly = mapUniqueViolation(error.message, error.code);
    return { error: friendly ?? error.message };
  }

  // Write audit log
  await writeAuditLog(data?.id ?? null, name, 'CREATE', actorEmail, { name, description, parent_role_id: parentRoleId });

  revalidateRbacViews();
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
  const supabase = await createClient();

  const { data: prior } = await admin
    .from('iam_role_permissions')
    .select('resource, actions, scope')
    .eq('role_id', roleId);

  const rows = permissions.map(p => ({
    role_id: roleId,
    resource: p.resource,
    actions: p.actions,
    scope: p.scope ?? 'all',
  }));

  const { error: delErr } = await admin.from('iam_role_permissions').delete().eq('role_id', roleId);
  if (delErr) return { error: delErr.message };

  if (rows.length > 0) {
    const { error: insErr } = await admin.from('iam_role_permissions').insert(rows);
    if (insErr) return { error: insErr.message };
  }

  const { data: authData } = await supabase.auth.getUser();
  const actorEmail = authData.user?.email ?? null;
  const { data: roleRow } = await admin.from('iam_roles').select('name').eq('id', roleId).maybeSingle();
  const roleName = roleRow?.name ?? 'unknown';

  await writeAuditLog(roleId, roleName, 'UPDATE', actorEmail, {
    kind: 'permissions_matrix',
    before: prior ?? [],
    after: rows.map(r => ({ resource: r.resource, actions: r.actions, scope: r.scope })),
  });

  revalidateRbacViews();
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
  const actorEmail =
    (formData.get('actor_email') as string) || (await getActorEmailFromSession());

  if (!id || !name) return { error: 'ID and Name are required' };

  const parentErr = await validateParentRoleSelection(
    id,
    parentRoleId,
    async rid => {
      const { data } = await supabase.from('iam_roles').select('parent_role_id').eq('id', rid).maybeSingle();
      return (data?.parent_role_id as string | null) ?? null;
    }
  );
  if (parentErr) return { error: parentErr };

  const { error } = await supabase
    .from('iam_roles')
    .update({ name, description, parent_role_id: parentRoleId })
    .eq('id', id);

  if (error) {
    const friendly = mapUniqueViolation(error.message, error.code);
    return { error: friendly ?? error.message };
  }

  // Write audit log
  await writeAuditLog(id, name, 'UPDATE', actorEmail, { name, description, parent_role_id: parentRoleId });

  revalidateRbacViews();
  return { success: true };
}
