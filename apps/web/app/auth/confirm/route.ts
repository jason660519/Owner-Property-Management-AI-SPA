/**
 * @file route.ts
 * @description Auth confirmation handler for email-based verification flows
 * (password recovery, email confirmations).
 *
 * Email templates link here with token_hash & type query params.
 * This route verifies the OTP with Supabase, establishes a session,
 * and redirects to the appropriate page.
 *
 * Flow:
 *   Recovery email → /auth/confirm?token_hash=XXX&type=recovery
 *     → verifyOtp() establishes session
 *     → redirect to /update-password
 *
 *   Invite type → redirect to /login?mode=invite (user enters 8-digit code there)
 *
 * @created 2026-02-13
 * @lastModified 2026-02-13
 * @version 1.1
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  // Validate required params
  if (!token_hash || !type) {
    console.error('Auth confirm: missing token_hash or type', { token_hash: !!token_hash, type });
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('驗證連結無效，請重新操作')}`
    );
  }

  // Invite flow: redirect to login in invite mode — user must enter their 8-digit invite code
  // (The invite email link should point to /login?mode=invite directly, but this is a backup path)
  if (type === 'invite') {
    return NextResponse.redirect(`${origin}/login?mode=invite`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    console.error('Auth confirm: OTP verification failed', error.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // Recovery flow → user needs to set a new password
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/update-password`);
  }

  // For email_change, signup, etc. → go to portal
  return NextResponse.redirect(`${origin}/portal`);
}
