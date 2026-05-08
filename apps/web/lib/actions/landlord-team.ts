'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface TeamMember {
  id: string;
  member_email: string;
  member_role: 'assistant' | 'accountant' | 'custom';
  role_label: string | null;
  status: 'pending' | 'active' | 'revoked';
  invited_at: string;
  permissions: MemberPermission[];
}

export interface MemberPermission {
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

export const RESOURCES = [
  { id: 'properties', label: '物件管理' },
  { id: 'tenants', label: '租客管理' },
  { id: 'finance', label: '財務報表' },
  { id: 'appointments', label: '預約管理' },
  { id: 'maintenance', label: '維修申請' },
  { id: 'documents', label: '合約文件' },
];

const ROLE_DEFAULTS: Record<string, Omit<MemberPermission, 'resource'>[]> = {
  assistant: RESOURCES.map(() => ({ can_read: true, can_write: false, can_delete: false })),
  accountant: RESOURCES.map((r, i) => ({
    can_read: true,
    can_write: r.id === 'finance' ? true : false,
    can_delete: false,
  })),
  custom: RESOURCES.map(() => ({ can_read: false, can_write: false, can_delete: false })),
};

export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: members } = await supabase
    .from('landlord_team_members')
    .select('*, landlord_member_permissions(*)')
    .eq('landlord_id', user.id)
    .order('invited_at', { ascending: false });

  return (members ?? []).map((m) => ({
    id: m.id,
    member_email: m.member_email as string,
    member_role: m.member_role as TeamMember['member_role'],
    role_label: m.role_label as string | null,
    status: m.status as TeamMember['status'],
    invited_at: m.invited_at as string,
    permissions: ((m.landlord_member_permissions as MemberPermission[]) ?? []),
  }));
}

export async function inviteTeamMember(
  email: string,
  role: 'assistant' | 'accountant' | 'custom',
  roleLabel?: string,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('landlord_team_members')
    .insert({
      landlord_id: user.id,
      member_email: email,
      member_role: role,
      role_label: roleLabel ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  // Seed default permissions
  const defaults = ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.custom;
  const rows = RESOURCES.map((r, i) => ({
    landlord_id: user.id,
    member_id: data.id,
    resource: r.id,
    can_read: defaults[i]?.can_read ?? false,
    can_write: defaults[i]?.can_write ?? false,
    can_delete: defaults[i]?.can_delete ?? false,
  }));

  await supabase.from('landlord_member_permissions').insert(rows);
  await supabase.from('landlord_permission_audit').insert({
    landlord_id: user.id,
    member_id: data.id,
    action: 'invite',
    actor_id: user.id,
    changes: { email, role },
  });

  revalidatePath('/landlord/team');
  return { id: data.id };
}

export async function updateMemberPermissions(
  memberId: string,
  permissions: MemberPermission[],
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  for (const perm of permissions) {
    const { error } = await supabase
      .from('landlord_member_permissions')
      .upsert(
        {
          landlord_id: user.id,
          member_id: memberId,
          resource: perm.resource,
          can_read: perm.can_read,
          can_write: perm.can_write,
          can_delete: perm.can_delete,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'member_id,resource' },
      );
    if (error) return { error: error.message };
  }

  await supabase.from('landlord_permission_audit').insert({
    landlord_id: user.id,
    member_id: memberId,
    action: 'update_permissions',
    actor_id: user.id,
    changes: { permissions },
  });

  revalidatePath('/landlord/team');
  return {};
}

export async function revokeMember(memberId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('landlord_team_members')
    .update({ status: 'revoked' })
    .eq('id', memberId)
    .eq('landlord_id', user.id);

  if (error) return { error: error.message };

  await supabase.from('landlord_permission_audit').insert({
    landlord_id: user.id,
    member_id: memberId,
    action: 'revoke',
    actor_id: user.id,
  });

  revalidatePath('/landlord/team');
  return {};
}
