import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 刷新 session - 重要！這樣 Server Components 就能取得最新的 session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 需要認證的路由
  const protectedRoutes = ['/landlord', '/super-admin', '/tenant', '/buyer'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // 如果是受保護的路由但沒有用戶，重導向到登入頁
  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 如果已登入且訪問登入頁，重導向到對應的儀表板
  if (user && request.nextUrl.pathname === '/login') {
    const role = user.user_metadata?.role || 'landlord';

    const dashboardMap: Record<string, string> = {
      super_admin: '/super-admin/dashboard',
      landlord: '/landlord/dashboard',
      tenant: '/tenant/dashboard',
      buyer: '/buyer/dashboard',
    };

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = dashboardMap[role] || '/landlord/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 匹配所有需要認證檢查的路由:
     * - /landlord/* - 房東儀表板
     * - /super-admin/* - 超級管理員儀表板
     * - /tenant/* - 租戶儀表板
     * - /buyer/* - 買家儀表板
     * - /login - 登入頁
     */
    '/landlord/:path*',
    '/super-admin/:path*',
    '/tenant/:path*',
    '/buyer/:path*',
    '/login',
  ],
};
