import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isSuperadminRoute = request.nextUrl.pathname.startsWith('/superadmin');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isRBACDev = request.nextUrl.pathname.includes('/rbac_access_control');

  if (isSuperadminRoute && !isLoginPage && !user && !isRBACDev) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginPage) {
    const role = user.user_metadata?.role;
    if (role === 'super_admin') {
      return NextResponse.redirect(new URL('/superadmin/dashboard', request.url));
    }
    // 已是登入狀態但非 super_admin：留在登入頁，讓使用者可登出後換超級管理員帳號
    return response;
  }

  // 造訪 /superadmin/* 但登入者非 super_admin → 導向本機登入頁（不導向主站，避免誤以為進錯站）
  if (isSuperadminRoute && !isLoginPage && user && user.user_metadata?.role !== 'super_admin') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'insufficient_role');
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/superadmin/:path*', '/login'],
};
