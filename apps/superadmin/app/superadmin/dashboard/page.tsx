import { getAdminDashboardStats } from '@/lib/actions/dashboard';
import SuperadminDashboardClient from './SuperadminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function SuperadminDashboardPage() {
  const stats = await getAdminDashboardStats();
  return <SuperadminDashboardClient stats={stats} />;
}
