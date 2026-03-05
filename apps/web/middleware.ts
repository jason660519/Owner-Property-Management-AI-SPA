import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Route role guards — most-specific prefix first so /tenant/contracted wins
// over /tenant.  super_admin always bypasses all guards.
// ---------------------------------------------------------------------------
const ROUTE_ROLE_GUARDS: [string, string[]][] = [
  ['/tenant/contracted', ['tenant', 'contract_tenant', 'contracted_tenant']],
  ['/tenant/potential',  ['potential_tenant']],
  ['/tenant',            ['tenant', 'contract_tenant', 'contracted_tenant', 'potential_tenant']],
  ['/buyer/contracted',  ['buyer', 'contract_buyer', 'contracted_buyer']],
  ['/buyer/potential',   ['potential_buyer']],
  ['/buyer',             ['buyer', 'contract_buyer', 'contracted_buyer', 'potential_buyer']],
  ['/landlord',          ['landlord']],
  ['/agent',             ['agent']],
  ['/service-provider',  ['service_provider', 'vendor']],
  // /portal has no guard — any authenticated user may access it
];

/** Returns the required roles for a given pathname, or null if no guard applies. */
function getRequiredRoles(pathname: string): string[] | null {
  for (const [prefix, roles] of ROUTE_ROLE_GUARDS) {
    if (pathname.startsWith(prefix)) return roles;
  }
  return null;
}

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
      cookieOptions: {
        name: 'sb-localhost-auth-token',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  );

  // Refresh session — Server Components need the latest session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Role Simulation Logic (Only for Super Admins)
  let effectiveRole = user?.user_metadata?.role || 'landlord';
  const simulationRole = request.cookies.get('x-simulation-role')?.value;

  // Verify the REAL user is actually a super_admin before allowing simulation.
  // This prevents non-admins from spoofing the cookie to escalate privileges.
  if (user && simulationRole && user.user_metadata?.role === 'super_admin') {
    effectiveRole = simulationRole;
    supabaseResponse.headers.set('x-simulation-mode', 'true');
    supabaseResponse.headers.set('x-effective-role', effectiveRole);
  }

  // Protected routes (super admin lives separately on port 3001)
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

  // 2. IAM role guard: authenticated user must hold a role allowed on this path.
  //    Uses get_user_roles() RPC for real-time IAM accuracy (same as superadmin middleware).
  //    Only fires when the path has a guard (skips /portal and other open paths).
  if (isProtectedRoute && user) {
    const requiredRoles = getRequiredRoles(request.nextUrl.pathname);
    if (requiredRoles) {
      const { data: roleRows } = await supabase.rpc('get_user_roles', {
        lookup_user_id: user.id,
      });
      const iamRoles: string[] = Array.isArray(roleRows)
        ? roleRows.map((r: { role_name: string }) => r.role_name)
        : [];

      // super_admin bypasses all route guards
      if (!iamRoles.includes('super_admin')) {
        // When simulation is active use the simulated role; otherwise real IAM roles
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

  // Auth routes (login / register / forgot-password)
  const authRoutes = ['/login', '/register', '/forgot-password'];
  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  // Server Action requests (POST with Next-Action header) should NOT be redirected —
  // otherwise sequential Server Action calls after login (e.g. getUserRoles) will fail.
  const isServerAction = request.method === 'POST' && request.headers.has('Next-Action');

  // 3. Already logged-in user hitting auth pages → redirect to dashboard
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

    // Multi-role users → portal for role selection
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
     * Match all routes that need auth checks (super admin is on port 3001).
     * Excludes static assets: _next/static, _next/image, favicon, images.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
