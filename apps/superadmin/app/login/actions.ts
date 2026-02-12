'use server';

import { createClient } from '@/utils/supabase/server';

interface LoginResult {
  success: boolean;
  error?: string;
  targetOrigin?: string;
  redirectUrl?: string | null;
}

export async function loginAction(prevState: any, formData: FormData): Promise<LoginResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const returnUrl = formData.get('returnUrl') as string | null;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  // Check role in user_metadata (role or primary_role) and app_metadata
  const userMetadata = data.user?.user_metadata || {};
  const appMetadata = data.user?.app_metadata || {};
  
  // Logic to determine role
  const role = userMetadata.role || userMetadata.primary_role || appMetadata.role;

  if (role !== 'super_admin') {
    // Sign out if not super admin
    await supabase.auth.signOut();
    return {
      success: false,
      error: '您的帳號沒有超級管理員權限',
      targetOrigin: process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000',
    };
  }

  return {
    success: true,
    targetOrigin: process.env.NEXT_PUBLIC_SUPERADMIN_URL || 'http://localhost:3001',
    redirectUrl: returnUrl || '/superadmin',
  };
}
