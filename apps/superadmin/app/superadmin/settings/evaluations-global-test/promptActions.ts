// filepath: apps/superadmin/app/superadmin/settings/evaluations-global-test/promptActions.ts
// Server actions for saving / loading named prompts from Supabase

'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { seedDefaultPromptsDirect } from '@/lib/ai/ensure-seeded';

export interface SavedPrompt {
  id: string;
  name: string;
  content: string;
  tags: string[];
  description: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavePromptOpts {
  tags?: string[];
  description?: string;
}

type LegacySystemPromptRow = {
  module_key: string | null;
  prompt_name: string | null;
  prompt_content: string | null;
  version: number | null;
};

function inferLegacyTags(moduleKey: string | null): string[] {
  if (!moduleKey) return ['系統預設', 'legacy'];
  if (moduleKey.startsWith('transcript')) return ['系統預設', '謄本解析', 'legacy'];
  if (moduleKey.startsWith('property')) return ['系統預設', '文案撰寫', 'legacy'];
  return ['系統預設', 'legacy'];
}

async function backfillLegacySystemPromptsToSavedPrompts(
  userId: string,
): Promise<{ created: number; error?: string }> {
  const admin = createAdminClient();

  const { data: existingRows, error: existingErr } = await admin
    .from('saved_prompts')
    .select('name, content, module_key');
  if (existingErr) return { created: 0, error: existingErr.message };

  const existingModuleKeys = new Set(
    (existingRows ?? [])
      .map((r) => r.module_key as string | null)
      .filter((k): k is string => !!k),
  );
  const existingNameContent = new Set(
    (existingRows ?? []).map((r) => `${String(r.name)}::${String(r.content)}`),
  );

  const { data: legacyRows, error: legacyErr } = await admin
    .from('ai_system_prompts')
    .select('module_key, prompt_name, prompt_content, version')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('version', { ascending: false });
  if (legacyErr) return { created: 0, error: legacyErr.message };

  const rows = (legacyRows ?? []) as LegacySystemPromptRow[];
  const seenModule = new Set<string>();
  const toInsert: Array<{
    name: string;
    content: string;
    tags: string[];
    description: string;
    module_key: string | null;
    created_by: string;
  }> = [];

  for (const row of rows) {
    const moduleKey = row.module_key?.trim() || null;
    if (moduleKey && seenModule.has(moduleKey)) continue;
    if (moduleKey) seenModule.add(moduleKey);

    const content = row.prompt_content?.trim() ?? '';
    if (!content) continue;
    const name = row.prompt_name?.trim() || `legacy-${moduleKey ?? 'prompt'}`;

    if (moduleKey && existingModuleKeys.has(moduleKey)) continue;
    const dedupeKey = `${name}::${content}`;
    if (existingNameContent.has(dedupeKey)) continue;

    toInsert.push({
      name,
      content,
      tags: inferLegacyTags(moduleKey),
      description: 'Legacy backfill from ai_system_prompts (auto-recovered)',
      module_key: moduleKey,
      created_by: userId,
    });
    existingNameContent.add(dedupeKey);
    if (moduleKey) existingModuleKeys.add(moduleKey);
  }

  if (!toInsert.length) return { created: 0 };

  const { error: insertErr } = await admin
    .from('saved_prompts')
    .insert(toInsert);
  if (insertErr) return { created: 0, error: insertErr.message };
  return { created: toInsert.length };
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
  // Safety net for SSoT migration: if legacy prompts still live in
  // ai_system_prompts, backfill them into saved_prompts so Prompt 管理不會「看起來消失」。
  const backfillResult = await backfillLegacySystemPromptsToSavedPrompts(auth.userId!);
  if (backfillResult.error) {
    return { error: `Legacy prompt backfill failed: ${backfillResult.error}` };
  }
  const seedResult = await seedDefaultPromptsDirect(admin);
  if (seedResult.errors.length) {
    console.warn('[prompt-management] default prompt seed warning:', seedResult.errors);
  }

  const { data, error } = await admin
    .from('saved_prompts')
    .select('id, name, content, tags, description, is_favorite, created_at, updated_at')
    .order('is_favorite', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: data as SavedPrompt[] };
}

export async function savePrompt(
  name: string,
  content: string,
  opts?: SavePromptOpts,
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
    .insert({
      name: trimmedName,
      content: trimmedContent,
      created_by: auth.userId,
      tags: opts?.tags ?? [],
      description: opts?.description?.trim() ?? '',
    })
    .select('id, name, content, tags, description, is_favorite, created_at, updated_at')
    .single();

  if (error) return { error: error.message };
  return { data: data as SavedPrompt };
}

export async function updatePrompt(
  id: string,
  name: string,
  content: string,
  opts?: SavePromptOpts,
): Promise<{ data?: SavedPrompt; error?: string }> {
  const trimmedName = name.trim();
  const trimmedContent = content.trim();

  if (!trimmedName) return { error: '請輸入 Prompt 名稱' };
  if (!trimmedContent) return { error: 'Prompt 內容不可為空' };

  const auth = await requireSuperAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const updatePayload: Record<string, unknown> = {
    name: trimmedName,
    content: trimmedContent,
    updated_at: new Date().toISOString(),
  };
  if (opts?.tags !== undefined) updatePayload.tags = opts.tags;
  if (opts?.description !== undefined) updatePayload.description = opts.description.trim();

  const { data, error } = await admin
    .from('saved_prompts')
    .update(updatePayload)
    .eq('id', id)
    .select('id, name, content, tags, description, is_favorite, created_at, updated_at')
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

export async function toggleFavorite(
  id: string,
  isFavorite: boolean,
): Promise<{ error?: string }> {
  const auth = await requireSuperAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from('saved_prompts')
    .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  return {};
}

export async function bulkExportPrompts(
  ids: string[],
): Promise<{ data?: SavedPrompt[]; error?: string }> {
  if (!ids.length) return { data: [] };

  const auth = await requireSuperAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('saved_prompts')
    .select('id, name, content, tags, description, is_favorite, created_at, updated_at')
    .in('id', ids);

  if (error) return { error: error.message };
  return { data: data as SavedPrompt[] };
}

// ---------------------------------------------------------------------------
// System prompt promotion: bridge saved_prompts → ai_system_prompts
// ---------------------------------------------------------------------------

export type OcrModuleKey = 'online_ocr_parse' | 'online_ocr_judge';

/**
 * @deprecated Use saved_prompts as the single source of truth instead.
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
 * @deprecated Use saved_prompts as the single source of truth instead.
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
