/**
 * Assign a user (by email) to multiple IAM groups so they get multiple roles in the Portal.
 * Usage: npx tsx scripts/assign_user_to_iam_groups.ts <email> [group1 group2 ...]
 * Default groups if none provided: Administrators, Standard Landlords, Agents, Active Tenants, Active Buyers, Vendors
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.join(process.cwd(), 'apps/web/.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

const DEFAULT_GROUPS = [
  'Administrators',      // super_admin
  'Standard Landlords',  // landlord
  'Agents',              // agent
  'Active Tenants',      // tenant (簽約租客)
  'Active Buyers',       // contract_buyer (簽約買家)
  'Potential Tenants',   // potential_tenant (潛在租客)
  'Potential Buyers',    // potential_buyer (潛在買家)
  'Vendors',             // vendor → service_provider
];

async function assignUserToGroups(email: string, groupNames: string[]) {
  console.log(`\n📌 Assigning ${email} to groups: ${groupNames.join(', ')}\n`);

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

  const { data: groups, error: groupError } = await admin
    .from('iam_groups')
    .select('id, name')
    .in('name', groupNames);

  if (groupError) {
    console.error('❌ Fetch groups failed:', groupError.message);
    process.exit(1);
  }
  if (!groups?.length) {
    console.error('❌ No matching groups found. Check group names.');
    process.exit(1);
  }

  for (const g of groups) {
    const { error: insertErr } = await admin.from('iam_group_members').insert({
      user_id: user.id,
      group_id: g.id,
    });
    if (insertErr) {
      if (insertErr.code === '23505') {
        console.log(`   ⏭️  Already in: ${g.name}`);
      } else {
        console.error(`   ❌ ${g.name}:`, insertErr.message);
      }
    } else {
      console.log(`   ✅ Added to: ${g.name}`);
    }
  }

  const { data: roles, error: rpcErr } = await admin.rpc('get_user_roles', {
    lookup_user_id: user.id,
  });
  if (!rpcErr && roles?.length) {
    const roleNames = roles.map((r: { role_name: string }) => r.role_name);
    console.log(`\n✅ get_user_roles(${email}) → ${roleNames.join(', ')}`);
  }
  console.log('\n   Trigger will sync users_profile.roles. Reload the Portal to see all roles.\n');
}

const email = process.argv[2];
const groupNames = process.argv.slice(3).length ? process.argv.slice(3) : DEFAULT_GROUPS;

if (!email) {
  console.error('Usage: npx tsx scripts/assign_user_to_iam_groups.ts <email> [group1 group2 ...]');
  process.exit(1);
}

assignUserToGroups(email, groupNames).catch((e) => {
  console.error(e);
  process.exit(1);
});
