// filepath: apps/superadmin/lib/actions/table-settings.ts
// Generic server actions for per-user, per-page table settings (user_page_settings)

'use server';

import { createClient } from '@/utils/supabase/server';

export async function getTableSettings<T extends Record<string, unknown>>(
  pageKey: string
): Promise<{ data: T | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Unauthorized' };

  const { data: row, error } = await supabase
    .from('user_page_settings')
    .select('settings')
    .eq('user_id', user.id)
    .eq('page_key', pageKey)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!row?.settings || typeof row.settings !== 'object') return { data: null };
  return { data: row.settings as T };
}

export async function setTableSettings<T extends Record<string, unknown>>(
  pageKey: string,
  settings: T
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('user_page_settings')
    .upsert(
      {
        user_id: user.id,
        page_key: pageKey,
        settings: settings as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,page_key' }
    );

  if (error) return { error: error.message };
  return {};
}
