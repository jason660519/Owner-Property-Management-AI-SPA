import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('Auth callback exchange error:', exchangeError);
    return NextResponse.redirect(new URL('/login?error=exchange_failed', request.url));
  }

  const { data: { user } } = await supabase.auth.getUser();
  
  // Query users_profile to check for roles
  const { data: profile } = await supabase
    .from('users_profile')
    .select('roles, primary_role')
    .eq('id', user?.id)
    .single();

  const roles = profile?.roles || [];
  const primaryRole = profile?.primary_role;
  const isSuperAdmin = roles.includes('super_admin') || primaryRole === 'super_admin';

  if (isSuperAdmin) {
    return NextResponse.redirect(new URL('/superadmin/dashboard', request.url));
  }

  // Handle other roles redirection - Sign out from Superadmin (Port 3001) before redirecting to Main Site (Port 3000)
  // This prevents having an active session on 3001 for a non-admin user
  await supabase.auth.signOut();

  if (roles.includes('landlord') || primaryRole === 'landlord') {
    return NextResponse.redirect(`${MAIN_SITE_URL}/landlord/dashboard`);
  }

  if (roles.includes('agent') || primaryRole === 'agent') {
    return NextResponse.redirect(`${MAIN_SITE_URL}/agent/dashboard`);
  }

  if (roles.includes('tenant') || primaryRole === 'tenant') {
    return NextResponse.redirect(`${MAIN_SITE_URL}/tenant/dashboard`);
  }

  return NextResponse.redirect(MAIN_SITE_URL);
}
