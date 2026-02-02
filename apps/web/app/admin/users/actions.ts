'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Invite a new user by email
export async function inviteUser(formData: FormData) {
    const supabaseAdmin = createAdminClient();
    const email = formData.get('email') as string;
    const groupId = formData.get('groupId') as string;

    if (!email) {
        return { error: 'Email is required' };
    }

    // 1. Invite User via Admin API
    const { data: userData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
        console.error('Error inviting user:', inviteError);
        return { error: inviteError.message };
    }

    // 2. Add to initial group if selected
    if (groupId && userData.user) {
        // We use the admin client here too to bypass RLS just in case, 
        // though standard RLS should allow super_admin to insert.
        // Using admin client is safer for "system" actions.
        const { error: groupError } = await supabaseAdmin
            .from('iam_group_members')
            .insert({
                user_id: userData.user.id,
                group_id: groupId
            });

        if (groupError) {
            console.error('Error adding user to group:', groupError);
            // We don't fail the whole action if group assignment fails, but we should warn
            return { success: true, warning: 'User invited but failed to add to group: ' + groupError.message };
        }
    }

    revalidatePath('/admin/users');
    return { success: true };
}
import { revalidatePath } from 'next/cache';

export type IAMUser = {
    id: string;
    email: string;
    groups: string[]; // names of groups
};

// Fetch all users and their associated groups
export async function getUsers(): Promise<IAMUser[]> {
    const supabase = await createClient();

    // 1. Get Users from our view
    const { data: users, error: userError } = await supabase
        .from('iam_users_view')
        .select('id, email')
        .order('created_at', { ascending: false });

    if (userError) throw new Error(`Failed to fetch users: ${userError.message}`);

    // 2. Get Group Memberships for all users
    // This could be optimized with a join if we had raw SQL or a better view, 
    // but for < 1000 users this is fine.
    const { data: memberships, error: memberError } = await supabase
        .from('iam_group_members')
        .select(`
      user_id,
      group:iam_groups(name)
    `);

    if (memberError) throw new Error(`Failed to fetch memberships: ${memberError.message}`);

    // 3. Merge data
    const userMap = new Map<string, IAMUser>();

    users.forEach(u => {
        userMap.set(u.id, {
            id: u.id,
            email: u.email || 'No Email',
            groups: []
        });
    });

    memberships.forEach((m: any) => {
        const user = userMap.get(m.user_id);
        if (user && m.group) {
            user.groups.push(m.group.name);
        }
    });

    return Array.from(userMap.values());
}

// Fetch all available groups (for the dropdown)
export async function getAllGroups() {
    const supabase = await createClient();
    const { data } = await supabase.from('iam_groups').select('id, name').order('name');
    return data || [];
}

// Add user to a group
export async function addUserToGroup(userId: string, groupId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('iam_group_members')
        .insert({ user_id: userId, group_id: groupId });

    if (error) {
        if (error.code === '23505') { // Unique violation
            return { success: false, message: 'User is already in this group' };
        }
        return { success: false, message: error.message };
    }

    revalidatePath('/admin/users');
    return { success: true };
}

// Remove user from a group
export async function removeUserFromGroup(userId: string, groupName: string) {
    const supabase = await createClient();

    // First find group ID from name
    const { data: group } = await supabase
        .from('iam_groups')
        .select('id')
        .eq('name', groupName)
        .single();

    if (!group) return { success: false, message: 'Group not found' };

    const { error } = await supabase
        .from('iam_group_members')
        .delete()
        .match({ user_id: userId, group_id: group.id });

    if (error) return { success: false, message: error.message };

    revalidatePath('/admin/users');
    return { success: true };
}
