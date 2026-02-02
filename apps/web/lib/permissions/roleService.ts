import { createClient } from '@/utils/supabase/client';

export type UserRole = string;
export type UserGroup = {
    id: string;
    name: string;
};

// This function fetches the "effective roles" for a user
// combining both direct roles and roles inherited from groups.
export async function fetchUserEffectiveRoles(userId: string): Promise<UserRole[]> {
    const supabase = createClient();

    // Call the database function we created in the migration
    const { data, error } = await supabase.rpc('get_user_roles', {
        lookup_user_id: userId
    });

    if (error) {
        console.error('Error fetching user roles:', error);
        return [];
    }

    // data will be an array of objects: [{ role_name: 'admin' }, { role_name: 'editor' }]
    return data.map((r: any) => r.role_name);
}

// Check if a user has a specific role
export async function hasRole(userId: string, roleName: string): Promise<boolean> {
    const roles = await fetchUserEffectiveRoles(userId);
    return roles.includes(roleName);
}
