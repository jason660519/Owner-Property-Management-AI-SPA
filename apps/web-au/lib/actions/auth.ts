// filepath: apps/web-au/lib/actions/auth.ts
'use server';

import { createClient as createServerClient } from '@/utils/supabase/server';

/** Serializable return type for Server Actions (no Session/User objects) */
type SignInResult =
  | { success: true; userId: string }
  | { success: false; error: string };

/**
 * Server-side sign in with password for Australia platform.
 * Sets auth cookies on the response so the client is logged in.
 */
export async function signInWithPasswordAction(email: string, password: string): Promise<SignInResult> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const isDev = process.env.NODE_ENV === 'development';
      let msg = 'Login failed. Please check your email and password.';

      if (isDev) {
        msg = error.message?.includes('unexpected response') || error.message?.includes('Unexpected response')
          ? 'Login rejected. Please check password; local dev ensure Supabase is running and Auth has Email login enabled.'
          : String(error.message ?? 'Login failed');
      }

      return { success: false, error: msg };
    }
    
    if (!data?.session || !data?.user?.id) {
      return { success: false, error: 'Login failed, no session obtained.' };
    }
    
    return { success: true, userId: String(data.user.id) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Login failed, please try again later.';
    console.error('signInWithPasswordAction error:', e);
    return { success: false, error: String(msg) };
  }
}

/**
 * Sync user roles to auth metadata (can be expanded later if needed)
 */
export async function syncUserRolesToAuthMetadata(userId: string) {
  // AU version implementation placeholder
  console.log('Syncing roles for user:', userId);
  return { success: true };
}

/**
 * Placeholder for getting user roles
 */
export async function getUserRoles(userId: string) {
  // AU version implementation placeholder
  console.log('Getting roles for user:', userId);
  return ['landlord']; // Default for now
}
