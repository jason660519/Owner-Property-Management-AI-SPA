// filepath: apps/web/lib/iam.ts
// created: 2026-02-14 | Option A: add user to IAM group by role (single source of truth)

import type { SupabaseClient } from '@supabase/supabase-js';

/** Role → IAM group name (must match supabase/migrations iam_groups.name) */
const ROLE_TO_GROUP_NAME: Record<string, string> = {
  landlord: 'Standard Landlords',
  agent: 'Agents',
  tenant: 'Active Tenants',
  buyer: 'Active Buyers',
  contract_buyer: 'Active Buyers',
  service_provider: 'Vendors',
  vendor: 'Vendors',
};

/**
 * Add a user to the IAM group that corresponds to the given role.
 * Used on signup/invite so profile.role is synced from IAM via trigger.
 * Requires admin (service_role) client.
 */
export async function addUserToIamGroupByRole(
  admin: SupabaseClient,
  userId: string,
  role: string
): Promise<{ ok: boolean; error?: string }> {
  const groupName = ROLE_TO_GROUP_NAME[role] ?? ROLE_TO_GROUP_NAME.landlord;
  const { data: group, error: groupErr } = await admin
    .from('iam_groups')
    .select('id')
    .eq('name', groupName)
    .limit(1)
    .single();

  if (groupErr || !group?.id) {
    console.warn('[IAM] Group not found:', groupName, groupErr);
    return { ok: false, error: groupErr?.message ?? 'Group not found' };
  }

  const { error: insertErr } = await admin.from('iam_group_members').insert({
    user_id: userId,
    group_id: group.id,
  });

  if (insertErr) {
    if (insertErr.code === '23505') return { ok: true };
    console.warn('[IAM] Insert member failed:', insertErr);
    return { ok: false, error: insertErr.message };
  }
  return { ok: true };
}
