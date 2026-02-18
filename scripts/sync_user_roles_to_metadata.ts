/**
 * Sync IAM roles to auth.users metadata for specified user
 * This ensures middleware can see roles without hitting the database
 * Usage: npx tsx scripts/sync_user_roles_to_metadata.ts <email>
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function syncUserRolesToMetadata(email: string) {
  console.log(`\n🔄 Syncing IAM roles to auth metadata for: ${email}\n`);

  // 1. Get user
  const { data: { users }, error: userError } = await admin.auth.admin.listUsers();
  if (userError) {
    console.error('❌ List users failed:', userError.message);
    process.exit(1);
  }
  const user = users.find((u) => u.email === email);
  if (!user) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }
  console.log(`   User ID: ${user.id}`);

  // 2. Get roles from IAM using RPC (single source of truth)
  const { data: roles, error: rpcErr } = await admin.rpc('get_user_roles', {
    lookup_user_id: user.id,
  });

  if (rpcErr) {
    console.error('❌ get_user_roles RPC failed:', rpcErr.message);
    process.exit(1);
  }

  const roleNames: string[] = Array.isArray(roles) 
    ? roles.map((r: any) => r.role_name || r).filter(Boolean)
    : [];

  if (roleNames.length === 0) {
    console.warn('⚠️  No roles found in IAM for this user.');
    console.log('   Run: npx tsx scripts/assign_user_to_iam_groups.ts ' + email);
    process.exit(0);
  }

  console.log(`   IAM Roles: ${roleNames.join(', ')}`);

  // 3. Update auth metadata
  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...user.user_metadata,
        roles: roleNames,
        role: roleNames[0], // Primary role
      },
    }
  );

  if (updateError) {
    console.error('❌ Update auth metadata failed:', updateError.message);
    process.exit(1);
  }

  console.log(`\n✅ Synced roles to auth metadata!`);
  console.log(`   User: ${email}`);
  console.log(`   Roles: ${roleNames.join(', ')}`);
  console.log(`   Primary Role: ${roleNames[0]}`);
  console.log(`\n   Now login should work correctly.\n`);
}

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx tsx scripts/sync_user_roles_to_metadata.ts <email>');
  process.exit(1);
}

syncUserRolesToMetadata(email).catch((e) => {
  console.error(e);
  process.exit(1);
});
