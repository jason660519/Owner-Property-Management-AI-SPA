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

export async function updatePrompt(
  id: string,
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
    .update({ name: trimmedName, content: trimmedContent, updated_at: new Date().toISOString() })
    .eq('id', id)
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

// ---------------------------------------------------------------------------
// System prompt promotion: bridge saved_prompts → ai_system_prompts
// ---------------------------------------------------------------------------

export type OcrModuleKey = 'online_ocr_parse' | 'online_ocr_judge';

/**
 * Promote a saved_prompt to be the active system prompt for a given OCR module.
 * Deactivates any existing active version, inserts a new version, and records
 * the source_saved_prompt_id so the Prompt 管理 UI can show the active badge.
 */
export async function setAsSystemPrompt(
  savedPromptId: string,
  moduleKey: OcrModuleKey,
): Promise<{ error?: string }> {
  const auth = await requireSuperAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();

  // Fetch the saved prompt content
  const { data: saved, error: fetchErr } = await admin
    .from('saved_prompts')
    .select('name, content')
    .eq('id', savedPromptId)
    .single();
  if (fetchErr || !saved) return { error: fetchErr?.message ?? 'Prompt 不存在' };

  // Deactivate existing active versions for this module
  await admin
    .from('ai_system_prompts')
    .update({ is_active: false })
    .eq('user_id', auth.userId!)
    .eq('module_key', moduleKey)
    .eq('provider', 'global')
    .eq('is_active', true);

  // Get next version number
  const { data: existing } = await admin
    .from('ai_system_prompts')
    .select('version')
    .eq('user_id', auth.userId!)
    .eq('module_key', moduleKey)
    .eq('provider', 'global')
    .order('version', { ascending: false })
    .limit(1);
  const nextVersion = ((existing?.[0]?.version as number | undefined) ?? 0) + 1;

  // Insert new active version with source reference
  const { error: insertErr } = await admin
    .from('ai_system_prompts')
    .insert({
      user_id: auth.userId!,
      module_key: moduleKey,
      provider: 'global',
      prompt_name: saved.name,
      prompt_content: saved.content,
      version: nextVersion,
      is_active: true,
      source_saved_prompt_id: savedPromptId,
    });

  if (insertErr) return { error: insertErr.message };
  return {};
}

/**
 * Returns the saved_prompt id that is currently the active system prompt
 * for the given module key (or null if set directly / never set).
 */
export async function getActiveSystemPromptSourceId(
  moduleKey: OcrModuleKey,
): Promise<{ data?: string | null; error?: string }> {
  const auth = await requireSuperAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('ai_system_prompts')
    .select('source_saved_prompt_id')
    .eq('user_id', auth.userId!)
    .eq('module_key', moduleKey)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };
  return { data: (data?.source_saved_prompt_id as string | null) ?? null };
}
