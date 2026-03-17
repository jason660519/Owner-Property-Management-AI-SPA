// filepath: apps/superadmin/app/superadmin/settings/actions.ts
// created: 2026-02-17 | Blacklist CRUD for superadmin (IP / User-Agent)

'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export type BlacklistType = 'ip' | 'user_agent';

export interface BlacklistEntry {
  id: string;
  type: BlacklistType;
  value: string;
  reason: string | null;
  created_at: string;
}

async function requireSuperAdmin(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: roleRows } = await supabase.rpc('get_user_roles', {
    lookup_user_id: user.id,
  });
  const roles = Array.isArray(roleRows)
    ? roleRows.map((r: { role_name: string }) => r.role_name)
    : [];
  const isSuperAdmin =
    roles.includes('super_admin') ||
    user.user_metadata?.role === 'super_admin';

  if (!isSuperAdmin) return { error: 'Unauthorized: Super Admin only' };
  return {};
}

export async function listBlacklist(): Promise<{
  data?: BlacklistEntry[];
  error?: string;
}> {
  const auth = await requireSuperAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('superadmin_blacklist')
    .select('id, type, value, reason, created_at')
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as BlacklistEntry[] };
}

export async function addBlacklistEntry(formData: FormData): Promise<{
  error?: string;
}> {
  const auth = await requireSuperAdmin();
  if (auth.error) return { error: auth.error };

  const type = (formData.get('type') as BlacklistType) || 'ip';
  const value = (formData.get('value') as string)?.trim();
  const reason = (formData.get('reason') as string)?.trim() || null;

  if (!value) return { error: '請輸入 IP 或 User-Agent 關鍵字' };
  if (type !== 'ip' && type !== 'user_agent')
    return { error: '類型須為 ip 或 user_agent' };

  const admin = createAdminClient();
  const { error: insertError } = await admin.from('superadmin_blacklist').insert({
    type,
    value,
    reason,
  });

  if (insertError) {
    if (insertError.code === '23505')
      return { error: '該項目已存在於黑名單' };
    return { error: insertError.message };
  }

  revalidatePath('/superadmin/settings');
  return {};
}

export async function removeBlacklistEntry(id: string): Promise<{
  error?: string;
}> {
  const auth = await requireSuperAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from('superadmin_blacklist')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/superadmin/settings');
  return {};
}

// ── System Settings ───────────────────────────────────────────────────────────

export async function getSystemSetting(key: string): Promise<{
  value?: unknown;
  error?: string;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) return { error: error.message };
  return { value: data?.value };
}

export async function updateSystemSetting(
  key: string,
  value: unknown
): Promise<{ error?: string }> {
  const auth = await requireSuperAdmin();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin
    .from('system_settings')
    .update({ value, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
    .eq('key', key);

  if (error) return { error: error.message };
  revalidatePath('/superadmin/settings/property-rules');
  return {};
}
