import { getAdminDashboardStats } from '@/lib/actions/dashboard';
import { FALLBACK_STATS } from '@/lib/actions/dashboard-types';
import type { AdminStats } from '@/lib/actions/dashboard-types';
import SuperadminDashboardClient from '@/components/dashboard/SuperadminDashboardClient';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SuperadminIndexPage() {
  let stats: AdminStats = FALLBACK_STATS;
  let userName: string | null = null;
  let dashboardLoadError: string | null = null;

  try {
    const [statsResult, supabaseResult] = await Promise.allSettled([
      getAdminDashboardStats(),
      createClient(),
    ]);

    if (statsResult.status === 'fulfilled') {
      stats = statsResult.value;
    } else {
      dashboardLoadError = statsResult.reason?.message ?? '無法載入儀表板資料';
    }

    if (supabaseResult.status === 'fulfilled') {
      const supabase = supabaseResult.value;
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: profile } = await supabase
          .from('users_profile')
          .select('display_name')
          .eq('id', user.id)
          .single();
        userName =
          profile?.display_name?.trim() ||
          user.user_metadata?.full_name?.trim() ||
          user.user_metadata?.name?.trim() ||
          user.email?.split('@')[0] ||
          null;
      }
    }
  } catch (err) {
    dashboardLoadError = err instanceof Error ? err.message : '無法載入儀表板資料';
  }

  return (
    <SuperadminDashboardClient
      stats={stats}
      userName={userName ?? undefined}
      loadError={dashboardLoadError ?? undefined}
    />
  );
}
