'use server';

import { createClient } from '@/lib/supabase/server';

export interface UserHeaderProfile {
  full_name?: string;
  avatar_url?: string;
  primary_role?: string;
}

export interface UserRedirectProfile {
  roles: string[];
  primary_role?: string;
}

export async function getUserHeaderProfile(): Promise<{
  userId: string;
  email?: string;
  profile: UserHeaderProfile | null;
} | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users_profile')
    .select('full_name, avatar_url, primary_role')
    .eq('user_id', user.id)
    .single();

  return {
    userId: user.id,
    email: user.email,
    profile: profile ?? null,
  };
}

export async function getUserRedirectProfile(): Promise<UserRedirectProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users_profile')
    .select('roles, primary_role')
    .eq('id', user.id)
    .single();

  const roles: string[] =
    profile?.roles ||
    user.app_metadata?.roles ||
    user.user_metadata?.roles ||
    [];

  return {
    roles,
    primary_role: profile?.primary_role || (roles.length === 1 ? roles[0] : undefined),
  };
}
