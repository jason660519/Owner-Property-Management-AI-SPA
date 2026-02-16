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
import { createAdminClient } from '@/utils/supabase/admin';
import { addUserToIamGroupByRole } from '@/lib/iam';
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
      // Invite type: redirect to login in invite mode so user enters their 8-digit code
      if (type === 'invite') {
        return NextResponse.redirect(`${origin}/login?mode=invite`);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (next && next !== '/') {
        return NextResponse.redirect(`${origin}${next}`);
      }

      if (user) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from('users_profile')
          .select('roles, primary_role')
          .eq('id', user.id) // Correct column is id (not user_id)
          .single();

        if (profile) {
          // Existing user - Always redirect to Portal
          // This allows users to:
          // 1. Choose which role to use (if they have multiple)
          // 2. Add new roles via the "Add Role" card
          // 3. See all their roles in one place
          return NextResponse.redirect(`${origin}/portal`);
        } else {
          // New user (OAuth first time)
          // Redirect to role selection page to let user choose their primary need
          // This provides better UX than defaulting to a role
          return NextResponse.redirect(`${origin}/onboarding/role-selection`);
        }
      }

      return NextResponse.redirect(`${origin}/`);
    }

    console.error('Exchange code error:', exchangeError);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
