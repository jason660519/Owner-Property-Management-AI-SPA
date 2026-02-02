
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), 'apps/web/.env.local');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
// Use the secret key from status.txt as fallback for local dev
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Service Key (masked):', supabaseServiceKey ? '******' : 'MISSING');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

// We need to simulate a logged-in user with 'super_admin' role.
// Since we don't have a quick way to "login" via script without password,
// we will use the Service Role Key to impersonate the user or just use Service Role 
// to verify the logic, BUT to test RLS accurately, we should really use an authenticated client.
//
// However, getting a valid JWT for a specific user in a script is tricky without their password.
//
// ALTERNATIVE STRATEGY FOR TDD SCRIPT:
// 1. Create a temporary test user via Service Role.
// 2. Assign 'super_admin' role to this test user via Service Role.
// 3. Login as this test user to get a session (need password).
// 4. Try to create a group using the USER client (this triggers RLS).
// 5. Cleanup.

async function runTest() {
    console.log('🚀 Starting IAM TDD Test...');

    // 1. Admin Client (Bypass RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Create Test User
    const testEmail = `tdd_admin_${Date.now()}@example.com`;
    const testPassword = 'password123';

    console.log(`Creating test user: ${testEmail}...`);
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
    });

    if (authError) {
        console.error('Failed to create test user:', authError);
        return;
    }

    const userId = authData.user.id;
    console.log(`Test User ID: ${userId}`);

    try {
        // 3. Assign 'super_admin' role to user (Direct DB Insert via Admin Client)
        // First get role id
        const { data: roles } = await adminClient.from('iam_roles').select('id').eq('name', 'super_admin').single();
        if (!roles) throw new Error('super_admin role not found');

        await adminClient.from('iam_user_roles').insert({
            user_id: userId,
            role_id: roles.id
        });
        console.log('Assigned super_admin role to test user.');

        // 4. Login as User to get User Client (Subject to RLS)
        const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data: sessionData, error: loginError } = await userClient.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (loginError) throw loginError;
        console.log('Logged in as test user.');

        // 5. ATTEMPT: Create Group (This is what failed in UI)
        const groupName = `TDD Group ${Date.now()}`;
        console.log(`Attempting to create group: '${groupName}' as user...`);

        const { data: groupData, error: groupError } = await userClient
            .from('iam_groups')
            .insert({
                name: groupName,
                description: 'Created via TDD script'
            })
            .select();

        if (groupError) {
            console.error('❌ TDD FAIL: Could not create group (Expected Behavior for now)');
            console.error('Error Code:', groupError.code);
            console.error('Error Message:', groupError.message);
            console.error('Error Details:', groupError.details);
        } else {
            console.log('✅ TDD SUCCESS: Group created!');
            console.log(groupData);
        }

        if (groupData && groupData.length > 0) {
            // 6. ATTEMPT: Update Group (Test Update Policy)
            const newName = `${groupName} (Updated)`;
            console.log(`Attempting to update group name to: '${newName}'...`);

            const { error: updateError } = await userClient
                .from('iam_groups')
                .update({ name: newName })
                .eq('id', groupData[0].id);

            if (updateError) {
                console.error('❌ TDD FAIL: Could not update group');
                console.error(updateError);
            } else {
                console.log('✅ TDD SUCCESS: Group updated!');
            }

            // 7. ATTEMPT: Assign Role to Group (Test Group Roles Policy)
            // First fetch a role
            const { data: landlordRole } = await adminClient.from('iam_roles').select('id').eq('name', 'landlord').single();

            if (landlordRole) {
                console.log(`Attempting to assign 'landlord' role to group...`);
                const { error: roleError } = await userClient
                    .from('iam_group_roles')
                    .insert({
                        group_id: groupData[0].id,
                        role_id: landlordRole.id
                    });

                if (roleError) {
                    console.error('❌ TDD FAIL: Could not assign role');
                    console.error(roleError);
                } else {
                    console.log('✅ TDD SUCCESS: Role assigned to group!');
                }
            } else {
                console.warn('⚠️ SKIP: Could not find "landlord" role to test assignment');
            }
        } else {
            console.error('❌ TDD SKIP: Group creation failed, cannot proceed with Update/Assign tests');
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    } finally {
        // Cleanup
        console.log('Cleaning up test user...');
        if (typeof userId !== 'undefined') {
            await adminClient.auth.admin.deleteUser(userId);
        }
    }
}

runTest();
