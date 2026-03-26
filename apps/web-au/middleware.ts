import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Route role guards — AU market uses the same role system as TW.
// AU-specific roles (e.g. conveyancer, licensed_agent_au) will be added here
// as the AU feature set grows.
// ---------------------------------------------------------------------------
const ROUTE_ROLE_GUARDS: [string, string[]][] = [
  ['/tenant/contracted', ['tenant', 'contract_tenant', 'contracted_tenant']],
  ['/tenant/potential', ['potential_tenant']],
  ['/tenant', ['tenant', 'contract_tenant', 'contracted_tenant', 'potential_tenant']],
  ['/buyer/contracted', ['buyer', 'contract_buyer', 'contracted_buyer']],
  ['/buyer/potential', ['potential_buyer']],
  ['/buyer', ['buyer', 'contract_buyer', 'contracted_buyer', 'potential_buyer']],
  ['/landlord', ['landlord']],
  ['/agent', ['agent']],
  ['/service-provider', ['service_provider', 'vendor']],
  // AU-specific roles — to be enabled as features land
  // ['/conveyancer', ['conveyancer']],
  // ['/licensed-agent', ['licensed_agent_au']],
];

function getRequiredRoles(pathname: string): string[] | null {
  for (const [prefix, roles] of ROUTE_ROLE_GUARDS) {
    if (pathname.startsWith(prefix)) return roles;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      cookieOptions: {
        name: 'sb-localhost-auth-token-au',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let effectiveRole = user?.user_metadata?.role || 'landlord';
  const simulationRole = request.cookies.get('x-simulation-role')?.value;

  if (user && simulationRole && user.user_metadata?.role === 'super_admin') {
    effectiveRole = simulationRole;
    supabaseResponse.headers.set('x-simulation-mode', 'true');
    supabaseResponse.headers.set('x-effective-role', effectiveRole);
  }

  const protectedRoutes = ['/landlord', '/tenant', '/buyer', '/agent', '/service-provider', '/portal'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // 1. Unauthenticated → login
  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. IAM role guard
  if (isProtectedRoute && user) {
    const requiredRoles = getRequiredRoles(request.nextUrl.pathname);
    if (requiredRoles) {
      const { data: roleRows } = await supabase.rpc('get_user_roles', {
        lookup_user_id: user.id,
      });
      const iamRoles: string[] = Array.isArray(roleRows)
        ? roleRows.map((r: { role_name: string }) => r.role_name)
        : [];

      if (!iamRoles.includes('super_admin')) {
        const activeRoles = simulationRole ? [simulationRole] : iamRoles;
        const hasAccess = requiredRoles.some((r) => activeRoles.includes(r));

        if (!hasAccess) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = '/portal';
          redirectUrl.searchParams.set('reason', 'insufficient_role');
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  const authRoutes = ['/login', '/register', '/forgot-password'];
  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route));
  const isServerAction = request.method === 'POST' && request.headers.has('Next-Action');

  // 3. Already logged-in user hitting auth pages → dashboard
  if (user && isAuthRoute && !isServerAction) {
    const roles: string[] = Array.isArray(user.user_metadata?.roles)
      ? (user.user_metadata.roles as string[]).map((r) => String(r))
      : [];
    const superadminUrl = process.env.NEXT_PUBLIC_SUPERADMIN_URL || 'http://localhost:3001';

    if (roles.length === 0) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/portal';
      return NextResponse.redirect(redirectUrl);
    }

    if (roles.length > 1 && !simulationRole) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/portal';
      return NextResponse.redirect(redirectUrl);
    }

    if (effectiveRole === 'super_admin' && !simulationRole) {
      return NextResponse.redirect(`${superadminUrl}/superadmin/dashboard`);
    }

    const dashboardMap: Record<string, string> = {
      landlord: '/landlord/dashboard',
      contracted_tenant: '/tenant/contracted/dashboard',
      tenant: '/tenant/contracted/dashboard',
      contract_tenant: '/tenant/contracted/dashboard',
      potential_tenant: '/tenant/potential/dashboard',
      contracted_buyer: '/buyer/contracted/dashboard',
      buyer: '/buyer/contracted/dashboard',
      contract_buyer: '/buyer/contracted/dashboard',
      potential_buyer: '/buyer/potential/dashboard',
      agent: '/agent/dashboard',
      service_provider: '/service-provider/dashboard',
      'service-provider': '/service-provider/dashboard',
      vendor: '/service-provider/dashboard',
    };
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = dashboardMap[effectiveRole] || '/landlord/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
