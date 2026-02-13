import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const isRBACDev = request.nextUrl.pathname.includes('/rbac_access_control');

  // ⚠️ 開發中 RBAC 視覺化頁面：完全略過認證與 Supabase 呼叫，避免 Supabase 未啟動時整頁卡住
  if (isRBACDev) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isSuperadminRoute = request.nextUrl.pathname.startsWith('/superadmin');
  const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000';

  // 1. 未登入：重導向至主站登入頁
  if (isSuperadminRoute && !user) {
    const loginUrl = new URL(`${MAIN_SITE_URL}/login`);
    // Pass the current URL as redirectTo so they can come back after login (if supported by main site login)
    // Note: Cross-domain redirect might need special handling, but basic link is fine.
    return NextResponse.redirect(loginUrl);
  }

  // 2. 已登入但非 Super Admin：重導向至主站登入頁 (權限不足)
  if (isSuperadminRoute && user && user.user_metadata?.role !== 'super_admin') {
    const loginUrl = new URL(`${MAIN_SITE_URL}/login`);
    loginUrl.searchParams.set('reason', 'insufficient_role');
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/superadmin/:path*'],
};
