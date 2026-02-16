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
          // Existing user, redirect based on role
          // Prioritize primary_role, fallback to first role in array, then default
          const roles = profile.roles || [];
          const role = profile.primary_role || (roles.length > 0 ? roles[0] : 'landlord');
          
          // Unified Login Logic:
          // If user has 'super_admin' role OR has multiple roles -> Redirect to Portal
          if (roles.includes('super_admin') || roles.length > 1) {
             return NextResponse.redirect(`${origin}/portal`);
          }

          const dashboardPath = `/${role.replace('_', '-')}/dashboard`;
          return NextResponse.redirect(`${origin}${dashboardPath}`);
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
