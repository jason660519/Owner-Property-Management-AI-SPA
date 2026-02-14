import { getAdminDashboardStats } from '@/lib/actions/dashboard';
import SuperadminDashboardClient from '@/components/dashboard/SuperadminDashboardClient';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SuperadminIndexPage() {
  const [stats, supabase] = await Promise.all([
    getAdminDashboardStats(),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let userName: string | null = null;
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
  return (
    <SuperadminDashboardClient
      stats={stats}
      userName={userName ?? undefined}
    />
  );
}
