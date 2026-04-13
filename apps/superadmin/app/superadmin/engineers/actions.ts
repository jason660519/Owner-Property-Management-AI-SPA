// apps/superadmin/app/superadmin/engineers/actions.ts
// Server Actions for engineer_profiles CRUD — Row 137

'use server';

import { createAdminClient } from '@/utils/supabase/admin';

interface EngineerProfile {
  id: string;
  user_id: string;
  display_name: string;
  preferred_ide: string;
  default_role: string;
  hourly_rate: number | null;
  max_concurrent_tasks: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreatePayload {
  user_id: string;
  display_name: string;
  preferred_ide?: string;
  default_role?: string;
  hourly_rate?: number | null;
  max_concurrent_tasks?: number;
}

interface UpdatePayload {
  display_name?: string;
  preferred_ide?: string;
  default_role?: string;
  hourly_rate?: number | null;
  max_concurrent_tasks?: number;
}

export async function listEngineers(): Promise<EngineerProfile[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('engineer_profiles')
    .select('*')
    .order('display_name');

  if (error) throw new Error(error.message);
  return (data ?? []) as EngineerProfile[];
}

export async function createEngineerProfile(
  payload: CreatePayload,
): Promise<EngineerProfile> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('engineer_profiles')
    .insert({
      user_id: payload.user_id,
      display_name: payload.display_name,
      preferred_ide: payload.preferred_ide ?? '',
      default_role: payload.default_role ?? '',
      hourly_rate: payload.hourly_rate ?? null,
      max_concurrent_tasks: payload.max_concurrent_tasks ?? 2,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as EngineerProfile;
}

export async function updateEngineerProfile(
  id: string,
  payload: UpdatePayload,
): Promise<EngineerProfile> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('engineer_profiles')
    .update({
      ...(payload.display_name !== undefined && { display_name: payload.display_name }),
      ...(payload.preferred_ide !== undefined && { preferred_ide: payload.preferred_ide }),
      ...(payload.default_role !== undefined && { default_role: payload.default_role }),
      ...(payload.hourly_rate !== undefined && { hourly_rate: payload.hourly_rate }),
      ...(payload.max_concurrent_tasks !== undefined && {
        max_concurrent_tasks: payload.max_concurrent_tasks,
      }),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as EngineerProfile;
}

export async function toggleEngineerActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('engineer_profiles')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) throw new Error(error.message);
}
