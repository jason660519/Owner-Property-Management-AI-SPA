import { Suspense } from 'react';
import { ExternalLink, Database } from 'lucide-react';
import { createAdminClient } from '@/utils/supabase/admin';
import SupabaseDashboardClient from './SupabaseDashboardClient';

export const dynamic = 'force-dynamic';

interface TableStat {
  schemaname: string;
  tablename: string;
  n_live_tup: number;
  n_dead_tup: number;
  last_autovacuum: string | null;
}

interface RLSPolicy {
  schemaname: string;
  tablename: string;
  policyname: string;
  cmd: string;
  roles: string[];
}

async function getDatabaseStats() {
  const supabase = createAdminClient();
  let healthy = false;
  let tablestats: TableStat[] = [];
  let rlsPolicies: RLSPolicy[] = [];
  let userCount = 0;

  try {
    // Health check: simple ping
    const { error: pingErr } = await supabase.from('iam_groups').select('id').limit(1);
    healthy = !pingErr;

    // Table stats via pg_stat_user_tables (raw SQL via rpc if available)
    // Fallback: list known public tables with record counts
    const knownTables = [
      'iam_roles', 'iam_groups', 'iam_user_group_memberships',
      'ai_performance_metrics', 'web_analytics', 'behavior_logs',
      'web_vitals', 'user_page_settings', 'module_model_assignments',
    ];

    const tableResults = await Promise.allSettled(
      knownTables.map(async (t) => {
        const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
        return { tablename: t, count: count ?? 0 };
      })
    );

    tablestats = tableResults
      .filter((r): r is PromiseFulfilledResult<{ tablename: string; count: number }> => r.status === 'fulfilled')
      .map(r => ({
        schemaname: 'public',
        tablename: r.value.tablename,
        n_live_tup: r.value.count,
        n_dead_tup: 0,
        last_autovacuum: null,
      }));

    // User count from auth.users
    const { count: uCount } = await supabase
      .from('iam_user_group_memberships')
      .select('user_id', { count: 'exact', head: true });
    userCount = uCount ?? 0;

    // RLS policies: use pg_policies view if accessible
    const { data: policies } = await supabase.rpc('get_rls_policies').maybeSingle();
    if (policies) {
      rlsPolicies = policies as RLSPolicy[];
    }
  } catch (err) {
    console.error('Error fetching DB stats:', err);
  }

  return { healthy, tablestats, rlsPolicies, userCount };
}

export default async function SupabasePage() {
  const { healthy, tablestats, rlsPolicies, userCount } = await getDatabaseStats();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? '';

  return (
    <Suspense
      fallback={
        <div className="p-8 min-h-screen bg-[#1A1A1A] flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <Database className="w-5 h-5 animate-pulse" />
            載入資料庫資訊...
          </div>
        </div>
      }
    >
      <SupabaseDashboardClient
        healthy={healthy}
        tablestats={tablestats}
        rlsPolicies={rlsPolicies}
        userCount={userCount}
        projectRef={projectRef}
        supabaseUrl={supabaseUrl}
      />
    </Suspense>
  );
}
