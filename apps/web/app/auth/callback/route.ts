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
          // New user (OAuth first time), create profile
          // Default to 'landlord' as this is "Owner Property Management" app, but maybe 'tenant' is safer?
          // Let's use 'landlord' as per the project name implication, or maybe check metadata?
          // Actually, defaulting to 'landlord' might be what the user expects for this app.
          const defaultRole = 'landlord'; 
          const metadata = user.user_metadata || {};
          const displayName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'New User';

          const { error: insertError } = await supabase
            .from('users_profile')
            .insert({
              id: user.id,
              email: user.email!,
              display_name: displayName,
              roles: [defaultRole],
              primary_role: defaultRole
            });

          if (insertError) {
            console.error('Failed to create user profile from OAuth:', insertError);
            return NextResponse.redirect(`${origin}/login?error=create_profile_failed&message=${encodeURIComponent(insertError.message)}`);
          }

          return NextResponse.redirect(`${origin}/${defaultRole}/dashboard`);
        }
      }

      return NextResponse.redirect(`${origin}/`);
    }

    console.error('Exchange code error:', exchangeError);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
