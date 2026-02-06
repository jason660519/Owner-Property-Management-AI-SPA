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
  const role = user?.user_metadata?.role;

  if (role === 'super_admin') {
    return NextResponse.redirect(new URL('/superadmin/dashboard', request.url));
  }

  return NextResponse.redirect(MAIN_SITE_URL);
}
