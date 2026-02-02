/**
 * @file route.ts
 * @description Auth callback handler for Supabase authentication flows
 * @created 2026-02-03
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-03
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.1
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth/Magic Link errors
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
            // Get user profile to determine dashboard redirect
            const { data: { user } } = await supabase.auth.getUser();

            // If next is specified (e.g., /update-password), use it
            // Otherwise, redirect based on user role
            if (next && next !== '/') {
                return NextResponse.redirect(`${origin}${next}`);
            }

            // Default: redirect to role-specific dashboard
            if (user) {
                const { data: profile } = await supabase
                    .from('users_profile')
                    .select('primary_role')
                    .eq('user_id', user.id)
                    .single();

                if (profile?.primary_role) {
                    const dashboardPath = `/${profile.primary_role.replace('_', '-')}/dashboard`;
                    return NextResponse.redirect(`${origin}${dashboardPath}`);
                }
            }

            // Fallback to home if no profile found
            return NextResponse.redirect(`${origin}/`);
        }

        console.error('Exchange code error:', exchangeError);
    }

    // If出錯或沒有 code，重導向到登入頁面
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
