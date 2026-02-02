
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.join(process.cwd(), 'apps/web/.env.local');
dotenv.config({ path: envPath });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function listRoles() {
    const { data, error } = await supabase.from('iam_roles').select('*');
    if (error) throw error;
    console.log(JSON.stringify(data, null, 2));
}

listRoles().catch(console.error);
