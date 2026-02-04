/**
 * @file route.ts
 * @description Auth callback handler for Supabase authentication flows
 * @created 2026-02-03
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-03
 * @modifiedBy Antigravity
 * @version 1.2
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const type = searchParams.get('type');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    console.error('Auth callback error:', error, errorDescription);
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (next && next !== '/') {
        return NextResponse.redirect(`${origin}${next}`);
      }

      if (user) {
        const { data: profile } = await supabase
          .from('users_profile')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role) {
          const dashboardPath = `/${profile.role.replace('_', '-')}/dashboard`;
          return NextResponse.redirect(`${origin}${dashboardPath}`);
        }
      }

      return NextResponse.redirect(`${origin}/`);
    }

    console.error('Exchange code error:', exchangeError);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
