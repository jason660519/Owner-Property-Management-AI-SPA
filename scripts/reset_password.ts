
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

const client = createClient(supabaseUrl, supabaseServiceKey);

async function resetPassword(email: string, newPassword: string) {
    console.log(`Resetting password for ${email}...`);

    // First, find the user
    const { data: { users }, error: listError } = await client.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.find(u => u.email === email);
    if (!user) {
        console.error(`❌ User not found: ${email}`);
        return;
    }

    const { error } = await client.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
    );

    if (error) {
        console.error('❌ Failed to update password:', error.message);
    } else {
        console.log('✅ Password updated successfully!');
        console.log(`User: ${email}`);
        console.log(`New Password: ${newPassword}`);
    }
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error('Usage: npx ts-node scripts/reset_password.ts <email> <new_password>');
    process.exit(1);
}

resetPassword(email, password).catch(console.error);
