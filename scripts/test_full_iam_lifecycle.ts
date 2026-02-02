
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), 'apps/web/.env.local');
dotenv.config({ path: envPath });

// Constants
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TEST_EMAIL = 'tdd_admin_' + Date.now() + '@example.com';
const TEST_PASSWORD = 'password123';

if (!SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Clients
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function runTDD() {
    console.log('🚀 Starting IAM Full Lifecycle TDD...');
    console.log('target user: ' + TEST_EMAIL);

    let userId: string | null = null;

    try {
        // STEP 1: Register User (Clean Slate)
        console.log('\n[1] Creating Test User...');
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            email_confirm: true
        });

        if (authError) throw authError;
        userId = authData.user.id;
        console.log(`✅ User Created: ${userId}`);

        // STEP 2: Verify Initial Permissions (Expect None)
        console.log('\n[2] Verifying Initial Roles (Expect None)...');
        const { data: initialRoles, error: rpcError1 } = await adminClient
            .rpc('get_user_roles', { lookup_user_id: userId });

        if (rpcError1) throw rpcError1;
        if (initialRoles.length > 0) throw new Error(`User should have 0 roles, found: ${initialRoles.map((r: any) => r.role_name)}`);
        console.log('✅ User has 0 roles as expected.');

        // STEP 3: Bootstrap Super Admin (Simulate bootstrap_admin.ts)
        console.log('\n[3] Bootstrapping Super Admin...');

        // 3.1 Get Super Admin Group
        const { data: group } = await adminClient.from('iam_groups').select('id').eq('name', 'Super Admins').single();
        if (!group) throw new Error("'Super Admins' group not found!");

        // 3.2 Add User to Group
        const { error: memberError } = await adminClient
            .from('iam_group_members')
            .insert({ user_id: userId, group_id: group.id });
        if (memberError) throw memberError;

        console.log(`✅ User added to 'Super Admins' (Group ID: ${group.id})`);

        // STEP 4: Verify Super Admin Role (Crucial Step: Testing get_user_roles logic)
        console.log("\n[4] Verifying 'get_user_roles' returns 'super_admin'...");
        const { data: adminRoles, error: rpcError2 } = await adminClient
            .rpc('get_user_roles', { lookup_user_id: userId });

        if (rpcError2) throw rpcError2;
        const roleNames = adminRoles.map((r: any) => r.role_name);
        console.log(`Found roles: [${roleNames.join(', ')}]`);

        if (!roleNames.includes('super_admin')) {
            throw new Error("❌ FAILED: User is in Super Admin group but get_user_roles did NOT return 'super_admin'. Check SQL Logic!");
        }
        console.log('✅ Logic Verified: User correctly inherits super_admin role.');

        // STEP 5: Test RLS - Create Group
        console.log('\n[5] Testing RLS: Create Group (Simulating Client)...');
        // We need to sign in as the user to test RLS
        const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        if (signInError) throw signInError;

        // Create a new client acting as the user
        const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            global: { headers: { Authorization: `Bearer ${signInData.session.access_token}` } }
        });

        const testGroupName = 'TDD Group ' + Date.now();
        const { data: newGroup, error: createError } = await userClient
            .from('iam_groups')
            .insert({ name: testGroupName, description: 'TDD Test' })
            .select()
            .single();

        if (createError) {
            console.error('RLS Violation Details:', createError);
            throw new Error(`❌ RLS FAILED: User could not create group. Policy is broken.`);
        }
        console.log(`✅ RLS Verified: Group '${newGroup.name}' created successfully.`);

        // STEP 6: Test Invite User (Admin Action)
        console.log('\n[6] Testing Invite User Flow...');
        const inviteEmail = 'invited_' + Date.now() + '@example.com';
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(inviteEmail);

        if (inviteError) throw inviteError;
        console.log(`✅ Invite sent to ${inviteEmail}. Status: ${inviteData.user.aud}`);

        // STEP 7: Test Password Reset Flow (Admin Trigger or User Request)
        console.log('\n[7] Testing Password Reset Flow...');
        // 7.1 Admin reset (Force)
        const { error: resetError } = await adminClient.auth.admin.updateUserById(
            userId!,
            { password: 'newpassword456' }
        );
        if (resetError) throw resetError;
        console.log('✅ Admin successfully reset password.');

        // 7.2 User requested reset (Simulate API call)
        const { error: forgotError } = await adminClient.auth.resetPasswordForEmail(TEST_EMAIL);
        if (forgotError) throw forgotError;
        console.log(`✅ Password reset email sent to ${TEST_EMAIL}`);

    } catch (e: any) {
        console.error('\n💥 TDD FAILED 💥');
        console.error(e.message);
        if (e.details) console.error(e.details);
    } finally {
        // Cleanup
        if (userId) {
            console.log('\n[Cleanup] Deleting Test User...');
            await adminClient.auth.admin.deleteUser(userId);
        }
        console.log('Done.');
    }
}

runTDD();
