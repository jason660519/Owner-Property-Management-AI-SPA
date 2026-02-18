// filepath: apps/superadmin/lib/resolve-ai-settings-user.ts
// Shared logic: resolve requested userId to an effective user (for 未登入時 fallback to first user).

import { createAdminClient } from '@/utils/supabase/admin';

export type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

/**
 * Resolve effective user ID for AI settings (keys/validate).
 * If requestedUserId exists in auth → use it. Else fallback to SUPERADMIN_DEFAULT_USER_ID or first user in auth.
 */
export async function resolveUserId(
  supabase: AdminClient,
  requestedUserId: string
): Promise<string | null> {
  const { data: userData, error: authError } = await supabase.auth.admin.getUserById(requestedUserId);
  if (!authError && userData?.user) return requestedUserId;

  const defaultId = process.env.SUPERADMIN_DEFAULT_USER_ID;
  if (defaultId) {
    const { data: defaultData } = await supabase.auth.admin.getUserById(defaultId);
    if (defaultData?.user) return defaultId;
  }
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1 });
  const firstUser = listData?.users?.[0];
  return firstUser?.id ?? null;
}
