// filepath: apps/web-au/app/auth/callback/route.ts
/**
 * @file route.ts
 * @description Auth callback handler for AU platform Supabase authentication
 * @created 2026-03-22
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/portal';
  const type = searchParams.get('type');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    console.error('AU Auth callback error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/update-password`);
      }

      // Default to portal for now (or onboarding for new users)
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('AU Exchange code error:', exchangeError);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
