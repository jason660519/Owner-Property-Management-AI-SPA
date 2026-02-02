
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), 'apps/web/.env.local');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
// Use the secret key from status.txt as fallback for local dev if missing in env
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Service Key (masked):', supabaseServiceKey ? '******' : 'MISSING');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

async function runTest() {
    console.log('🚀 Starting Invite User TDD Test...');

    // Admin Client (required for inviteUserByEmail)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const testEmail = `tdd_invite_${Date.now()}@example.com`;

    try {
        // 1. ATTEMPT: Invite User
        console.log(`Attempting to invite user: ${testEmail}...`);

        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(testEmail);

        if (inviteError) {
            console.error('❌ TDD FAIL: Could not invite user');
            console.error(inviteError);
            return;
        }

        console.log('✅ TDD SUCCESS: User invited!');
        console.log('Invited User ID:', inviteData.user.id);

        // 2. VERIFY: User exists in auth.users (Implicit by above success, but good to check status)
        // In local dev, invites might auto-confirm or stay pending. 
        console.log('User Role:', inviteData.user.role);
        console.log('User Confirmed At:', inviteData.user.email_confirmed_at);

        // 3. CLEANUP
        console.log('Cleaning up invited user...');
        await adminClient.auth.admin.deleteUser(inviteData.user.id);
        console.log('Cleanup complete.');

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

runTest();
