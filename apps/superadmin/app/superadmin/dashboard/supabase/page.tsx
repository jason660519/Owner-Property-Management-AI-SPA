import { Suspense } from 'react';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Database } from 'lucide-react';
import { createAdminClient } from '@/utils/supabase/admin';
import SupabaseDashboardClient from './SupabaseDashboardClient';

export const dynamic = 'force-dynamic';

interface TableStat {
  schemaname: string;
  tablename: string;
  n_live_tup: number;
  n_dead_tup: number;
  last_updated_at: string | null;
}

interface RLSPolicy {
  schemaname: string;
  tablename: string;
  policyname: string;
  cmd: string;
  roles: string[];
}

interface MigrationHistoryItem {
  version: string;
  appliedAt: string | null;
  status: 'applied' | 'pending';
}

const KNOWN_TABLES = [
  'iam_roles',
  'iam_groups',
  'iam_user_group_memberships',
  'ai_performance_metrics',
  'web_analytics',
  'behavior_logs',
  'web_vitals',
  'user_page_settings',
  'module_model_assignments',
];

const TIMESTAMP_CANDIDATES = ['updated_at', 'created_at', 'inserted_at'];

async function getTableLastUpdatedAt(
  supabase: ReturnType<typeof createAdminClient>,
  tableName: string,
): Promise<string | null> {
  for (const columnName of TIMESTAMP_CANDIDATES) {
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .not(columnName, 'is', null)
      .order(columnName, { ascending: false })
      .limit(1);

    if (error) continue;
    const value = data?.[0]?.[columnName as keyof (typeof data)[0]];
    if (typeof value === 'string' && value) return value;
  }

  return null;
}

async function readLocalMigrationVersions(): Promise<string[]> {
  const candidates = [
    path.resolve(process.cwd(), 'supabase/migrations'),
    path.resolve(process.cwd(), '../../supabase/migrations'),
    path.resolve(process.cwd(), '../supabase/migrations'),
  ];

  for (const dir of candidates) {
    try {
      const files = await fs.readdir(dir);
      const versions = files
        .filter((filename) => /^\d{14}.*\.sql$/.test(filename))
        .map((filename) => filename.match(/^(\d{14})/)?.[1])
        .filter((version): version is string => Boolean(version))
        .sort((a, b) => b.localeCompare(a));

      if (versions.length > 0) return versions;
    } catch {
      // Keep trying fallback directories.
    }
  }

  return [];
}

async function getMigrationHistory(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<MigrationHistoryItem[]> {
  const localVersions = await readLocalMigrationVersions();

  const migrationSchemaClient =
    typeof (supabase as { schema?: unknown }).schema === 'function'
      ? (supabase as { schema: (schemaName: string) => ReturnType<typeof createAdminClient> }).schema(
          'supabase_migrations',
        )
      : supabase;

  const { data: appliedRows } = await migrationSchemaClient
    .from('schema_migrations')
    .select('version, inserted_at')
    .order('version', { ascending: false })
    .limit(200);

  const appliedMap = new Map<string, string | null>();
  for (const row of appliedRows ?? []) {
    const version = String((row as { version?: unknown }).version ?? '');
    if (!version) continue;
    const insertedAt =
      typeof (row as { inserted_at?: unknown }).inserted_at === 'string'
        ? ((row as { inserted_at?: string }).inserted_at ?? null)
        : null;
    appliedMap.set(version, insertedAt);
  }

  if (localVersions.length === 0) {
    return Array.from(appliedMap.entries()).map(([version, appliedAt]) => ({
      version,
      appliedAt,
      status: 'applied',
    }));
  }

  return localVersions.map((version) => ({
    version,
    appliedAt: appliedMap.get(version) ?? null,
    status: appliedMap.has(version) ? 'applied' : 'pending',
  }));
}

async function getConnectionCount(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<number | null> {
  try {
    if (typeof (supabase as { schema?: unknown }).schema !== 'function') return null;

    const pgCatalogClient = (
      supabase as { schema: (schemaName: string) => ReturnType<typeof createAdminClient> }
    ).schema('pg_catalog');

    const { count, error } = await pgCatalogClient
      .from('pg_stat_activity')
      .select('pid', { count: 'exact', head: true });

    if (error) return null;
    return count ?? null;
  } catch {
    return null;
  }
}

async function getDatabaseStats() {
  const supabase = createAdminClient();
  let healthy = false;
  let latencyMs: number | null = null;
  let connectionCount: number | null = null;
  let tablestats: TableStat[] = [];
  let rlsPolicies: RLSPolicy[] = [];
  let userCount = 0;
  let migrationHistory: MigrationHistoryItem[] = [];

  try {
    const start = Date.now();
    const { error: pingErr } = await supabase.from('iam_groups').select('id').limit(1);
    latencyMs = Date.now() - start;
    healthy = !pingErr;

    connectionCount = await getConnectionCount(supabase);

    const tableResults = await Promise.allSettled(
      KNOWN_TABLES.map(async (tableName) => {
        const [{ count }, lastUpdatedAt] = await Promise.all([
          supabase.from(tableName).select('*', { count: 'exact', head: true }),
          getTableLastUpdatedAt(supabase, tableName),
        ]);

        return {
          schemaname: 'public',
          tablename: tableName,
          n_live_tup: count ?? 0,
          n_dead_tup: 0,
          last_updated_at: lastUpdatedAt,
        } as TableStat;
      }),
    );

    tablestats = tableResults
      .filter((result): result is PromiseFulfilledResult<TableStat> => result.status === 'fulfilled')
      .map((result) => result.value);

    const { count: uCount } = await supabase
      .from('iam_user_group_memberships')
      .select('user_id', { count: 'exact', head: true });
    userCount = uCount ?? 0;

    const { data: policies } = await supabase.rpc('get_rls_policies').maybeSingle();
    if (policies) rlsPolicies = policies as RLSPolicy[];

    migrationHistory = await getMigrationHistory(supabase);
  } catch (error) {
    console.error('Error fetching Supabase dashboard stats:', error);
  }

  return {
    healthy,
    latencyMs,
    connectionCount,
    tablestats,
    rlsPolicies,
    userCount,
    migrationHistory,
  };
}

export default async function SupabasePage() {
  const {
    healthy,
    latencyMs,
    connectionCount,
    tablestats,
    rlsPolicies,
    userCount,
    migrationHistory,
  } = await getDatabaseStats();

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
        latencyMs={latencyMs}
        connectionCount={connectionCount}
        tablestats={tablestats}
        rlsPolicies={rlsPolicies}
        userCount={userCount}
        migrationHistory={migrationHistory}
        projectRef={projectRef}
        supabaseUrl={supabaseUrl}
      />
    </Suspense>
  );
}
