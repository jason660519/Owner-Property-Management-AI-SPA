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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

  // Role Simulation Logic (Only for Super Admins)
  let effectiveRole = user?.user_metadata?.role || 'landlord';
  const simulationRole = request.cookies.get('x-simulation-role')?.value;

  // Verify if the REAL user is actually a super_admin before allowing simulation
  // This prevents non-admins from spoofing the cookie to escalate privileges
  if (user && simulationRole && user.user_metadata?.role === 'super_admin') {
    effectiveRole = simulationRole;
    // Inject a header so downstream components know we are simulating
    supabaseResponse.headers.set('x-simulation-mode', 'true');
    supabaseResponse.headers.set('x-effective-role', effectiveRole);
  }

  // 需要認證的路由（超級管理員獨立在 port 3001，此站為房東/租客/買家等）
  const protectedRoutes = ['/landlord', '/tenant', '/buyer', '/agent', '/service-provider', '/portal'];
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

  // 認證相關路由（已登入時應重定向）
  const authRoutes = ['/login', '/register', '/forgot-password'];
  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  // Server Action requests (POST with Next-Action header) should NOT be redirected —
  // otherwise sequential Server Action calls after login (e.g. getUserRoles) will fail
  // because the middleware redirects the POST and the client gets HTML instead of RSC payload.
  const isServerAction = request.method === 'POST' && request.headers.has('Next-Action');

  // 如果已登入且訪問認證頁面，重導向到對應的儀表板（跳過 Server Action）
  if (user && isAuthRoute && !isServerAction) {
    const role = effectiveRole;
    const roles: string[] = Array.isArray(user.user_metadata?.roles)
      ? (user.user_metadata.roles as string[]).map((r) => String(r))
      : [];
    const superadminUrl = process.env.NEXT_PUBLIC_SUPERADMIN_URL || 'http://localhost:3001';

    // No roles in metadata (e.g. legacy session): send to portal so it can load from IAM
    if (roles.length === 0) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/portal';
      return NextResponse.redirect(redirectUrl);
    }

    // Multi-role users (or super_admin with other roles) → portal for role selection
    if (roles.length > 1 && !simulationRole) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/portal';
      return NextResponse.redirect(redirectUrl);
    }

    // Single-role super_admin → superadmin dashboard on port 3001
    if (role === 'super_admin' && !simulationRole) {
      return NextResponse.redirect(`${superadminUrl}/superadmin/dashboard`);
    }

    const dashboardMap: Record<string, string> = {
      landlord: '/landlord/dashboard',
      // tenant canonical + aliases
      contracted_tenant: '/tenant/contracted/dashboard',
      tenant: '/tenant/contracted/dashboard',
      contract_tenant: '/tenant/contracted/dashboard',
      potential_tenant: '/tenant/potential/dashboard',
      // buyer canonical + aliases
      contracted_buyer: '/buyer/contracted/dashboard',
      buyer: '/buyer/contracted/dashboard',
      contract_buyer: '/buyer/contracted/dashboard',
      potential_buyer: '/buyer/potential/dashboard',
      // agent
      agent: '/agent/dashboard',
      // service provider aliases
      service_provider: '/service-provider/dashboard',
      'service-provider': '/service-provider/dashboard',
      serviceprovider: '/service-provider/dashboard',
      vendor: '/service-provider/dashboard',
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
     * 匹配所有需要認證檢查的路由（超級管理員在 port 3001，不在此站）
     * - /landlord/*     - 房東儀表板
     * - /tenant/*       - 租戶儀表板
     * - /buyer/*        - 買家儀表板
     * - /agent/*        - 經紀人儀表板
     * - /service-provider/* - 服務商儀表板
     * - /portal/*       - 角色選擇入口
     * - /login          - 登入頁
     * - /register       - 註冊頁
     * - /forgot-password - 忘記密碼頁
     * 
     * 排除靜態資源:
     * - /_next/static, /_next/image
     * - favicon.ico
     * - 图片文件 (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
