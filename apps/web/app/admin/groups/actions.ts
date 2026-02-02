'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createGroup(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  if (!name) {
    return { error: 'Group name is required' };
  }

  const { error } = await supabase
    .from('iam_groups')
    .insert({ name, description });

  if (error) {
    console.error('Error creating group:', error);
    return { error: error.message };
  }

  revalidatePath('/admin/groups');
  return { success: true };
}

export async function updateGroup(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  if (!id || !name) {
    return { error: 'Group ID and Name are required' };
  }

  const { error } = await supabase
    .from('iam_groups')
    .update({ name, description })
    .eq('id', id);

  if (error) {
    console.error('Error updating group:', error);
    return { error: error.message };
  }

  revalidatePath('/admin/groups');
  return { success: true };
}

export async function assignGroupRoles(groupId: string, roleIds: string[]) {
  const supabase = await createClient();

  // 1. Delete existing roles for this group
  const { error: deleteError } = await supabase
    .from('iam_group_roles')
    .delete()
    .eq('group_id', groupId);

  if (deleteError) {
    console.error('Error clearing group roles:', deleteError);
    return { error: deleteError.message };
  }

  // 2. Insert new roles
  if (roleIds.length > 0) {
    const { error: insertError } = await supabase
      .from('iam_group_roles')
      .insert(
        roleIds.map(roleId => ({
          group_id: groupId,
          role_id: roleId
        }))
      );

    if (insertError) {
      console.error('Error assigning group roles:', insertError);
      return { error: insertError.message };
    }
  }

  revalidatePath('/admin/groups');
  return { success: true };
}

export async function getGroups() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('iam_groups')
    .select(`
      *,
      member_count:iam_group_members(count),
      roles:iam_group_roles(
        role:iam_roles(name)
      )
    `)
    .order('name');

  if (error) throw error;

  // Transform the data to be easier to use in UI
  return data.map(group => ({
    ...group,
    member_count: group.member_count?.[0]?.count || 0,
    roles: group.roles.map((r: any) => r.role.name)
  }));
}

export async function getRoles() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('iam_roles').select('*').order('name');
  if (error) throw error;
  return data;
}
