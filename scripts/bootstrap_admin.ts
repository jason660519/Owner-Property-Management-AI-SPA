
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), 'apps/web/.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing in apps/web/.env.local');
    console.error('Please add it to run this script.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function bootstrapAdmin(email: string) {
    console.log(`🚀 Bootstrapping Admin Access for: ${email}`);

    // 1. Find User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = users.find(u => u.email === email);
    if (!user) {
        console.error(`❌ User not found with email: ${email}`);
        return;
    }
    console.log(`✅ Found User ID: ${user.id}`);

    // 2. Find or Create 'Super Admins' Group
    const { data: groupData, error: groupError } = await supabase
        .from('iam_groups')
        .select('id')
        .eq('name', 'Super Admins')
        .single();

    let groupId = groupData?.id;

    if (!groupId) {
        console.log("Creating 'Super Admins' group...");
        const { data: newGroup, error: createError } = await supabase
            .from('iam_groups')
            .insert({
                name: 'Super Admins',
                description: 'System Administrators with full access',
                is_system_managed: true
            })
            .select()
            .single();

        if (createError) throw createError;
        groupId = newGroup.id;
    }
    console.log(`✅ Super Admins Group ID: ${groupId}`);

    // 3. Find 'super_admin' Role
    const { data: roleData, error: roleError } = await supabase
        .from('iam_roles')
        .select('id')
        .eq('name', 'super_admin')
        .single();

    if (!roleData) {
        throw new Error("Role 'super_admin' not found in database. Did you run seed?");
    }
    console.log(`✅ Super Admin Role ID: ${roleData.id}`);

    // 4. Assign Role to Group (if not exists)
    const { error: assignRoleError } = await supabase
        .from('iam_group_roles')
        .upsert({ group_id: groupId, role_id: roleData.id }, { onConflict: 'group_id, role_id' });

    if (assignRoleError) throw assignRoleError;
    console.log(`✅ Assigned 'super_admin' role to 'Super Admins' group`);

    // 5. Add User to Group
    const { error: memberError } = await supabase
        .from('iam_group_members')
        .upsert({ user_id: user.id, group_id: groupId }, { onConflict: 'user_id, group_id' });

    if (memberError) throw memberError;

    // 6. Update Auth Metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
            ...user.user_metadata,
            role: 'super_admin',
            primary_role: 'super_admin'
        },
        app_metadata: {
            ...user.app_metadata,
            role: 'super_admin'
        }
    });

    if (updateError) throw updateError;
    console.log(`✅ Updated Auth Metadata for ${email}`);

    console.log(`✅ SUCCESS! User ${email} is now a Super Admin.`);
    console.log(`Please refresh your browser to pick up the new RLS permissions.`);
}

const emailArg = process.argv[2];
if (!emailArg) {
    console.error('Usage: npx ts-node scripts/bootstrap_admin.ts <your-email>');
    process.exit(1);
}

bootstrapAdmin(emailArg).catch(e => {
    console.error('Unexpected error:', e);
    process.exit(1);
});
