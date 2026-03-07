// filepath: apps/superadmin/app/superadmin/settings/evaluations-global-test/promptActions.ts
// Server actions for saving / loading named prompts from Supabase

'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export interface SavedPrompt {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/** Verify the calling user is a super_admin. Returns their user id on success. */
async function requireSuperAdmin(): Promise<{ userId?: string; error?: string }> {
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
  return { userId: user.id };
}

export async function listSavedPrompts(): Promise<{
  data?: SavedPrompt[];
  error?: string;
}> {
  const auth = await requireSuperAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('saved_prompts')
    .select('id, name, content, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: data as SavedPrompt[] };
}

export async function savePrompt(
  name: string,
  content: string,
): Promise<{ data?: SavedPrompt; error?: string }> {
  const trimmedName = name.trim();
  const trimmedContent = content.trim();

  if (!trimmedName) return { error: '請輸入 Prompt 名稱' };
  if (!trimmedContent) return { error: 'Prompt 內容不可為空' };

  const auth = await requireSuperAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('saved_prompts')
    .insert({ name: trimmedName, content: trimmedContent, created_by: auth.userId })
    .select('id, name, content, created_at, updated_at')
    .single();

  if (error) return { error: error.message };
  return { data: data as SavedPrompt };
}

export async function deleteSavedPrompt(id: string): Promise<{ error?: string }> {
  const auth = await requireSuperAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from('saved_prompts')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };
  return {};
}
