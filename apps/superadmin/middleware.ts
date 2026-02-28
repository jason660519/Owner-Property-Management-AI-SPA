import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

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

  const isRBACDev = request.nextUrl.pathname.includes('/rbac_access_control');

  // ⚠️ 開發中 RBAC 視覺化頁面：完全略過認證與 Supabase 呼叫，避免 Supabase 未啟動時整頁卡住
  if (isRBACDev) {
    return NextResponse.next({ request });
  }

  const isSuperadminRoute = request.nextUrl.pathname.startsWith('/superadmin');

  // 黑名單檢查：superadmin 路由先檢查 IP / User-Agent，封鎖駭客與惡意爬蟲
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
        const { data: blocked } = await admin.rpc('check_superadmin_blacklist', {
          p_ip: ip,
          p_user_agent: userAgent,
        });
        if (blocked === true) {
          return new NextResponse('Forbidden', { status: 403 });
        }
      } catch {
        // 黑名單查詢失敗時不阻擋請求，避免影響可用性
      }
    }
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
      cookieOptions: {
        name: 'sb-localhost-auth-token',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. 未登入：重導向至本機登入頁（同 port 3001），避免依賴 3000 主站
  if (isSuperadminRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    const returnUrl = request.nextUrl.pathname + request.nextUrl.search;
    if (returnUrl && returnUrl !== '/login') loginUrl.searchParams.set('returnUrl', returnUrl);
    return NextResponse.redirect(loginUrl);
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
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/docs', '/superadmin/:path*'],
};
