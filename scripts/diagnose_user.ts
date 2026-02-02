
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), 'apps/web/.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseUser(email: string) {
    console.log(`🔍 Diagnosing User: ${email}`);

    // 1. Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;
    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('❌ User not found.');
        return;
    }
    console.log(`User ID: ${user.id}`);

    // 2. Check Group Memberships
    const { data: members, error: memberError } = await supabase
        .from('iam_group_members')
        .select(`
            group_id,
            group:iam_groups (
                name,
                iam_group_roles (
                    iam_roles (name)
                )
            )
        `)
        .eq('user_id', user.id);

    if (memberError) console.error('Member Error:', memberError);
    console.log('Groups:', JSON.stringify(members, null, 2));

    // 3. Check Direct Roles (user_roles)
    const { data: directRoles, error: directRolesError } = await supabase
        .from('iam_user_roles')
        .select(`
            role_id,
            iam_roles (name)
        `)
        .eq('user_id', user.id);

    if (directRolesError) console.error('Direct Roles Error:', directRolesError);
    console.log('Direct Roles:', JSON.stringify(directRoles, null, 2));

    // 4. Test RPC `get_user_roles`
    // We need to call this AS the user (simulate RLS) or just check logic.
    // Calling as admin might return empty if it uses auth.uid(), so we can't easily test it via admin client 
    // unless we use a transaction or checking the function logic.
    // However, we can inspect the raw tables above to see if data exists.
}

const emailArg = process.argv[2];
if (!emailArg) {
    console.error('Usage: npx ts-node scripts/diagnose_user.ts <email>');
    process.exit(1);
}

diagnoseUser(emailArg).catch(console.error);
