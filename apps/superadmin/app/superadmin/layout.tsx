import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { navItems } from '@/components/layout/nav-items';
import { createClient } from '@/utils/supabase/server';
import { getAccessibleRoutes } from '@/lib/rbac/permissions';

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allRoutes = navItems.map(item => item.href);

  // Determine accessible routes based on user roles
  let accessibleHrefs: string[] = allRoutes;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: roleRows } = await supabase.rpc('get_user_roles', {
        lookup_user_id: user.id,
      });
      const roles = Array.isArray(roleRows)
        ? roleRows.map((r: { role_name: string }) => r.role_name)
        : [];
      const isSuperAdmin =
        roles.includes('super_admin') ||
        user.user_metadata?.role === 'super_admin';

      accessibleHrefs = await getAccessibleRoutes(supabase, user.id, isSuperAdmin, allRoutes);
    }
  } catch {
    // If role check fails, fall back to showing all routes
    accessibleHrefs = allRoutes;
  }

  return (
    <div className="min-h-screen bg-bg-secondary transition-colors duration-200">
      <DashboardHeader />
      <Sidebar accessibleHrefs={accessibleHrefs} />
      <div className="ml-16 pt-16 transition-all duration-300 ease-in-out h-screen flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 min-h-0 flex flex-col p-6 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
