import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseRedirectCookieBridge } from '@/lib/middleware/supabase-redirect-cookies';

/** 從 request 取得客戶端 IP（支援 proxy 的 x-forwarded-for / x-real-ip） */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

export async function middleware(request: NextRequest) {
  // Redirect /docs to /superadmin/docs so both URLs work
  if (request.nextUrl.pathname === '/docs') {
    return NextResponse.redirect(new URL('/superadmin/docs', request.url));
  }

  const isSuperadminRoute = request.nextUrl.pathname.startsWith('/superadmin');

  // IP 白名單 + 黑名單檢查：superadmin 路由先檢查 IP / User-Agent
  // 白名單非空時：不在白名單內的 IP 直接拒絕（優先）
  // 黑名單：符合黑名單的 IP / User-Agent 拒絕
  if (isSuperadminRoute) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceKey) {
      try {
        const admin = createClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const ip = getClientIp(request);
        const userAgent = request.headers.get('user-agent') ?? null;

        // 1. 白名單檢查（若白名單非空，未在白名單的 IP 直接拒絕）
        const { data: whitelisted } = await admin.rpc('check_ip_whitelist', { p_ip: ip });
        if (whitelisted === false) {
          return new NextResponse('Forbidden', { status: 403 });
        }

        // 2. 黑名單檢查
        const { data: blocked } = await admin.rpc('check_superadmin_blacklist', {
          p_ip: ip,
          p_user_agent: userAgent,
        });
        if (blocked === true) {
          return new NextResponse('Forbidden', { status: 403 });
        }
      } catch {
        // IP 檢查失敗時不阻擋請求，避免影響可用性
      }
    }
  }

  let response = NextResponse.next({ request });
  const redirectCookies = createSupabaseRedirectCookieBridge();

  // 與 apps/web 一致：本機 http://localhost 須 lax + 非 Secure，否則 session cookie 無法寫入／帶上
  const isProduction = process.env.NODE_ENV === 'production';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror request cookies so downstream NextResponse.next() picks them up
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          redirectCookies.recordFromSetAll(cookiesToSet);
        },
      },
      cookieOptions: {
        name: 'sb-localhost-auth-token',
        sameSite: 'lax',
        secure: isProduction,
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Helper: redirect while preserving Supabase session cookies (incl. httpOnly / path / sameSite).
  // Do not use response.cookies.getAll() alone — it drops options and breaks refresh.
  const redirectWithCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    redirectCookies.applyToRedirect(redirectResponse.cookies);
    return redirectResponse;
  };

  // 1. 未登入：重導向至本機登入頁（同 port 3001），避免依賴 3000 主站
  if (isSuperadminRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    const returnUrl = request.nextUrl.pathname + request.nextUrl.search;
    if (returnUrl && returnUrl !== '/login') loginUrl.searchParams.set('returnUrl', returnUrl);
    return redirectWithCookies(loginUrl);
  }

  // 2. 已登入：以 IAM 為準判斷是否為 Super Admin（與主站 Portal 一致）
  if (isSuperadminRoute && user) {
    const { data: roleRows } = await supabase.rpc('get_user_roles', {
      lookup_user_id: user.id,
    });
    const roles = Array.isArray(roleRows)
      ? roleRows.map((r: { role_name: string }) => r.role_name)
      : [];
    const isSuperAdmin =
      roles.includes('super_admin') ||
      user.user_metadata?.role === 'super_admin';
    if (!isSuperAdmin) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('reason', 'insufficient_role');
      return redirectWithCookies(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/docs', '/superadmin/:path*'],
};
