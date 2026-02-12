// filepath: apps/web/app/(dashboard)/tenant/dashboard/page.tsx
/**
 * Tenant dashboard entry - redirects to contracted dashboard by default.
 * Tenant can switch to potential dashboard via TenantSidebar.
 */

import { redirect } from 'next/navigation';

export default function TenantDashboardEntryPage() {
  redirect('/tenant/contracted/dashboard');
}
