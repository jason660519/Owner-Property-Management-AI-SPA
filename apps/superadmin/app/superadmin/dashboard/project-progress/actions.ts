// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/actions.ts
// created: 2026-02-19 | Sync project progress column widths & presets to DB per user

'use server';

import { createClient } from '@/utils/supabase/server';
import {
  PROJECT_PROGRESS_PAGE_KEY,
  type ProjectProgressSettingsPayload,
} from './types';

export async function getProjectProgressSettings(): Promise<{
  data: ProjectProgressSettingsPayload | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Unauthorized' };

  const { data: row, error } = await supabase
    .from('user_page_settings')
    .select('settings')
    .eq('user_id', user.id)
    .eq('page_key', PROJECT_PROGRESS_PAGE_KEY)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!row?.settings || typeof row.settings !== 'object') return { data: null };
  return { data: row.settings as ProjectProgressSettingsPayload };
}

export async function setProjectProgressSettings(
  settings: ProjectProgressSettingsPayload
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
        page_key: PROJECT_PROGRESS_PAGE_KEY,
        settings: settings as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,page_key' }
    );

  if (error) return { error: error.message };
  return {};
}
