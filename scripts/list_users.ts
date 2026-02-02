
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
    console.log('Trying to list users anyway using a common local default key (might fail)...');
}

// Fallback to what might be a default local key if env is missing, just in case
// But really we need the user to provide it.
const client = createClient(supabaseUrl, supabaseServiceKey || 'sb_service_role_key_placeholder');

async function listUsers() {
    console.log(`Connecting to ${supabaseUrl}...`);
    const { data: { users }, error } = await client.auth.admin.listUsers();

    if (error) {
        console.error('Check your Service Role Key!');
        throw error;
    }

    console.log('\n--- Registered Users ---');
    if (users.length === 0) {
        console.log('No users found.');
    } else {
        users.forEach(u => {
            console.log(`Email: ${u.email} | ID: ${u.id} | Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'}`);
        });
    }
    console.log('------------------------\n');
}

listUsers().catch(e => console.error(e));
