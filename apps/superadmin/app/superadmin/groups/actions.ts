'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

const BASE = '/superadmin/groups';

export async function createGroup(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  if (!name) return { error: 'Group name is required' };
  const { error } = await supabase.from('iam_groups').insert({ name, description });
  if (error) {
    console.error('Error creating group:', error);
    return { error: error.message };
  }
  revalidatePath(BASE);
  return { success: true };
}

export async function updateGroup(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  if (!id || !name) return { error: 'Group ID and Name are required' };
  const { error } = await supabase.from('iam_groups').update({ name, description }).eq('id', id);
  if (error) {
    console.error('Error updating group:', error);
    return { error: error.message };
  }
  revalidatePath(BASE);
  return { success: true };
}

export async function assignGroupRoles(groupId: string, roleIds: string[]) {
  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from('iam_group_roles')
    .delete()
    .eq('group_id', groupId);
  if (deleteError) {
    console.error('Error clearing group roles:', deleteError);
    return { error: deleteError.message };
  }
  if (roleIds.length > 0) {
    const { error: insertError } = await supabase
      .from('iam_group_roles')
      .insert(roleIds.map((roleId) => ({ group_id: groupId, role_id: roleId })));
    if (insertError) {
      console.error('Error assigning group roles:', insertError);
      return { error: insertError.message };
    }
  }
  revalidatePath(BASE);
  return { success: true };
}

export type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  roles: string[];
  is_system_managed?: boolean;
};

export async function getGroups(): Promise<GroupRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('iam_groups')
    .select(`
      *,
      member_count:iam_group_members(count),
      roles:iam_group_roles(role:iam_roles(name))
    `)
    .order('name');
  if (error) throw error;
  return (data || []).map((group: { member_count?: { count: number }[]; roles: { role: { name: string } }[] } & Record<string, unknown>) => ({
    ...group,
    member_count: group.member_count?.[0]?.count || 0,
    roles: group.roles.map((r: { role: { name: string } }) => r.role.name),
  })) as GroupRow[];
}

/** Fetch all iam_roles for Superadmin (Invite User / Edit Group). Uses service_role so we always get the full list. */
export async function getRoles() {
  const admin = createAdminClient();
  const { data, error } = await admin.from('iam_roles').select('id, name, description').order('name');
  if (error) throw error;
  return data ?? [];
}
