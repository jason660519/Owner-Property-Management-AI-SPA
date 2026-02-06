'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

const BASE = '/superadmin/users';

export async function inviteUser(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'super_admin') return { error: 'Unauthorized: Admin access required' };

  const supabaseAdmin = createAdminClient();
  const email = formData.get('email') as string;
  const groupId = formData.get('groupId') as string;
  if (!email) return { error: 'Email is required' };

  const { data: userData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email);
  if (inviteError) {
    console.error('Error inviting user:', inviteError);
    return { error: inviteError.message };
  }

  if (groupId && userData.user) {
    const { error: groupError } = await supabaseAdmin.from('iam_group_members').insert({
      user_id: userData.user.id,
      group_id: groupId,
    });
    if (groupError) {
      console.error('Error adding user to group:', groupError);
      return { success: true, warning: 'User invited but failed to add to group: ' + groupError.message };
    }
  }

  revalidatePath(BASE);
  return { success: true };
}

export type IAMUser = {
  id: string;
  email: string;
  groups: string[];
};

export async function getUsers(): Promise<IAMUser[]> {
  const supabase = await createClient();
  const { data: users, error: userError } = await supabase
    .from('iam_users_view')
    .select('id, email')
    .order('created_at', { ascending: false });
  if (userError) throw new Error(`Failed to fetch users: ${userError.message}`);

  const { data: memberships, error: memberError } = await supabase
    .from('iam_group_members')
    .select('user_id, group:iam_groups(name)');
  if (memberError) throw new Error(`Failed to fetch memberships: ${memberError.message}`);

  const userMap = new Map<string, IAMUser>();
  users.forEach((u) => {
    userMap.set(u.id, { id: u.id, email: u.email || 'No Email', groups: [] });
  });
  memberships.forEach((m: { user_id: string; group?: { name: string } | { name: string }[] }) => {
    const user = userMap.get(m.user_id);
    const groupName = Array.isArray(m.group) ? m.group[0]?.name : m.group?.name;
    if (user && groupName) user.groups.push(groupName);
  });
  return Array.from(userMap.values());
}

export async function getAllGroups() {
  const supabase = await createClient();
  const { data } = await supabase.from('iam_groups').select('id, name').order('name');
  return data || [];
}

export async function addUserToGroup(userId: string, groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('iam_group_members').insert({ user_id: userId, group_id: groupId });
  if (error) {
    if (error.code === '23505') return { success: false, message: 'User is already in this group' };
    return { success: false, message: error.message };
  }
  revalidatePath(BASE);
  return { success: true };
}

export async function removeUserFromGroup(userId: string, groupName: string) {
  const supabase = await createClient();
  const { data: group } = await supabase.from('iam_groups').select('id').eq('name', groupName).single();
  if (!group) return { success: false, message: 'Group not found' };
  const { error } = await supabase
    .from('iam_group_members')
    .delete()
    .match({ user_id: userId, group_id: group.id });
  if (error) return { success: false, message: error.message };
  revalidatePath(BASE);
  return { success: true };
}
