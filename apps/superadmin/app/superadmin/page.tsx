import { getAdminDashboardStats } from '@/lib/actions/dashboard';
import SuperadminDashboardClient from '@/components/dashboard/SuperadminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function SuperadminIndexPage() {
  const stats = await getAdminDashboardStats();
  return <SuperadminDashboardClient stats={stats} />;
}
