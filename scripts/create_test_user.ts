
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

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

async function run() {
    console.log('🚀 Creating Test User...');

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const testEmail = `test_remember_${Date.now()}@example.com`;
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
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    console.log('✅ User created successfully. You can now login.');
}

run();
