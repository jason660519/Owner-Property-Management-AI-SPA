'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Database,
  ExternalLink,
  Activity,
  Shield,
  Table2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock3,
  Network,
  Play,
  Download,
  FileClock,
  TerminalSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

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

interface BackupItem {
  id: string;
  filename: string;
  size: number;
  created_at?: string;
}

interface SqlResult {
  columns: string;
  table: string;
  limit: number;
  rowCount: number;
  rows: Array<Record<string, unknown>>;
}

interface SupabaseDashboardClientProps {
  healthy: boolean;
  latencyMs: number | null;
  connectionCount: number | null;
  tablestats: TableStat[];
  rlsPolicies: RLSPolicy[];
  userCount: number;
  migrationHistory: MigrationHistoryItem[];
  projectRef: string;
  supabaseUrl: string;
}

function formatDateTime(raw: string | null | undefined): string {
  if (!raw) return 'N/A';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

export default function SupabaseDashboardClient({
  healthy,
  latencyMs,
  connectionCount,
  tablestats,
  rlsPolicies,
  userCount,
  migrationHistory,
  projectRef,
  supabaseUrl,
}: SupabaseDashboardClientProps) {
  const dashboardUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}`
    : 'http://localhost:54323/project/default';

  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM iam_groups LIMIT 20');
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlResult, setSqlResult] = useState<SqlResult | null>(null);

  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);

  const sortedTableStats = useMemo(
    () => [...tablestats].sort((a, b) => b.n_live_tup - a.n_live_tup),
    [tablestats],
  );

  async function refreshBackups() {
    setBackupError(null);
    try {
      const response = await fetch('/api/backup', { cache: 'no-store' });
      const payload = (await response.json()) as { backups?: BackupItem[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load backups');
      }
      setBackups(payload.backups ?? []);
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Failed to load backups');
    }
  }

  useEffect(() => {
    void refreshBackups();
  }, []);

  async function runSqlQuery() {
    setSqlLoading(true);
    setSqlError(null);
    setSqlResult(null);

    try {
      const response = await fetch('/api/supabase/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery }),
      });

      const payload = (await response.json()) as SqlResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'SQL query failed');
      }

      setSqlResult(payload);
    } catch (error) {
      setSqlError(error instanceof Error ? error.message : 'SQL query failed');
    } finally {
      setSqlLoading(false);
    }
  }

  async function runManualBackup() {
    setBackupLoading(true);
    setBackupError(null);

    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual_from_supabase_dashboard' }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Backup failed');
      }

      await refreshBackups();
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Backup failed');
    } finally {
      setBackupLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-[#1A1A1A] min-h-screen text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Database className="h-7 w-7 text-emerald-400" />
            Supabase 資料庫管理
          </h1>
          {supabaseUrl && <p className="text-gray-500 text-xs mt-1 font-mono">{supabaseUrl}</p>}
          <p className="text-gray-500 text-xs mt-1">IAM 使用者數: {userCount}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#333333] text-gray-400 hover:text-white text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Supabase Dashboard
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#2A2A2A] border-[#333333]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${healthy ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <Activity className={`w-5 h-5 ${healthy ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-400">連線狀態</p>
              <div className="flex items-center gap-2 mt-1">
                {healthy ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">正常</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-medium">異常</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2A2A2A] border-[#333333]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Table2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">監控資料表數</p>
              <p className="text-2xl font-bold text-white mt-1">{tablestats.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2A2A2A] border-[#333333]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/10">
              <Clock3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">延遲</p>
              <p className="text-2xl font-bold text-white mt-1">{latencyMs ?? 'N/A'}{latencyMs !== null ? 'ms' : ''}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2A2A2A] border-[#333333]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-violet-500/10">
              <Network className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">連線數</p>
              <p className="text-2xl font-bold text-white mt-1">{connectionCount ?? 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#2A2A2A] border-[#333333]">
        <CardHeader className="border-b border-[#333333] pb-4">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Table2 className="w-4 h-4 text-blue-400" />
            資料表記錄數與最後更新時間
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-[#333333] text-gray-400 text-xs">
                <tr>
                  <th className="px-4 py-3">Schema</th>
                  <th className="px-4 py-3">資料表名稱</th>
                  <th className="px-4 py-3 text-right">記錄數</th>
                  <th className="px-4 py-3">最後更新</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {sortedTableStats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      無法取得資料表資訊
                    </td>
                  </tr>
                ) : (
                  sortedTableStats.map((tableStat) => (
                    <tr key={tableStat.tablename} className="hover:bg-[#333333]/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs">{tableStat.schemaname}</td>
                      <td className="px-4 py-3 font-mono text-sm text-white">{tableStat.tablename}</td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {tableStat.n_live_tup.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {formatDateTime(tableStat.last_updated_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#2A2A2A] border-[#333333]">
        <CardHeader className="border-b border-[#333333] pb-4">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <TerminalSquare className="w-4 h-4 text-emerald-400" />
            SQL 查詢（僅 SELECT）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <textarea
            value={sqlQuery}
            onChange={(event) => setSqlQuery(event.target.value)}
            rows={4}
            className="w-full rounded-md bg-[#1A1A1A] border border-[#333333] text-sm p-3 font-mono text-gray-200"
            placeholder="SELECT * FROM iam_groups LIMIT 20"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={runSqlQuery}
              disabled={sqlLoading}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 text-sm"
            >
              <Play className="w-4 h-4" />
              {sqlLoading ? '執行中...' : '執行查詢'}
            </button>
            <p className="text-xs text-gray-500">支援格式: SELECT &lt;columns&gt; FROM [schema.]table [LIMIT n]</p>
          </div>

          {sqlError && <p className="text-sm text-red-400">{sqlError}</p>}

          {sqlResult && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                table: <span className="font-mono text-gray-300">{sqlResult.table}</span> | rows: {sqlResult.rowCount}
              </p>
              <div className="overflow-x-auto border border-[#333333] rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-[#1A1A1A] border-b border-[#333333] text-gray-400">
                    <tr>
                      {Object.keys(sqlResult.rows[0] ?? {}).map((column) => (
                        <th key={column} className="px-3 py-2 text-left font-mono">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333333]">
                    {sqlResult.rows.map((row, index) => (
                      <tr key={index}>
                        {Object.entries(row).map(([column, value]) => (
                          <td key={`${index}-${column}`} className="px-3 py-2 text-gray-300 align-top">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#2A2A2A] border-[#333333]">
        <CardHeader className="border-b border-[#333333] pb-4">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <FileClock className="w-4 h-4 text-cyan-400" />
            Migration 歷史
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-[#333333] text-gray-400 text-xs">
                <tr>
                  <th className="px-4 py-3">版本</th>
                  <th className="px-4 py-3">狀態</th>
                  <th className="px-4 py-3">執行時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {migrationHistory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      無 migration 資訊
                    </td>
                  </tr>
                ) : (
                  migrationHistory.slice(0, 50).map((item) => (
                    <tr key={item.version}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-200">{item.version}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs ${
                            item.status === 'applied'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {item.status === 'applied' ? '已執行' : '待執行'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(item.appliedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#2A2A2A] border-[#333333]">
        <CardHeader className="border-b border-[#333333] pb-4">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400" />
            手動備份與下載
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-center gap-3">
            <button
              onClick={runManualBackup}
              disabled={backupLoading}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-4 py-2 text-sm"
            >
              <Play className="w-4 h-4" />
              {backupLoading ? '備份中...' : '觸發手動備份'}
            </button>
            <button
              onClick={() => void refreshBackups()}
              className="inline-flex items-center gap-2 rounded-md border border-[#333333] px-3 py-2 text-sm text-gray-300 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
              重新整理備份列表
            </button>
          </div>

          {backupError && <p className="text-sm text-red-400">{backupError}</p>}

          <div className="overflow-x-auto border border-[#333333] rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#1A1A1A] border-b border-[#333333] text-gray-400 text-xs">
                <tr>
                  <th className="px-4 py-3">檔案</th>
                  <th className="px-4 py-3">建立時間</th>
                  <th className="px-4 py-3">大小 (bytes)</th>
                  <th className="px-4 py-3">下載</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      尚無備份檔案
                    </td>
                  </tr>
                ) : (
                  backups.slice(0, 20).map((backup) => (
                    <tr key={backup.id}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-300">{backup.filename}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(backup.created_at)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{backup.size.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`/api/backup/${backup.id}`}
                          className="inline-flex items-center gap-2 text-xs text-emerald-300 hover:text-emerald-200"
                        >
                          <Download className="w-3 h-3" />
                          下載
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {rlsPolicies.length > 0 && (
        <Card className="bg-[#2A2A2A] border-[#333333]">
          <CardHeader className="border-b border-[#333333] pb-4">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-400" />
              RLS 政策
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-[#333333] text-gray-400 text-xs">
                  <tr>
                    <th className="px-4 py-3">資料表</th>
                    <th className="px-4 py-3">政策名稱</th>
                    <th className="px-4 py-3">操作</th>
                    <th className="px-4 py-3">角色</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {rlsPolicies.map((policy, index) => (
                    <tr key={index} className="hover:bg-[#333333]/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-white">{policy.tablename}</td>
                      <td className="px-4 py-3 text-gray-300 text-xs">{policy.policyname}</td>
                      <td className="px-4 py-3 text-blue-400 text-xs">{policy.cmd}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {Array.isArray(policy.roles) ? policy.roles.join(', ') : String(policy.roles)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-[#2A2A2A] border-[#333333]">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">Supabase 快速連結</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Table Editor', path: '/editor' },
              { label: 'SQL Editor', path: '/sql/new' },
              { label: 'Auth Users', path: '/auth/users' },
              { label: 'Storage', path: '/storage/buckets' },
              { label: 'API Docs', path: '/api' },
              { label: 'Logs', path: '/logs/explorer' },
              { label: 'Backups', path: '/database/backups/scheduled' },
              { label: 'Advisors', path: '/advisors' },
            ].map((link) => (
              <a
                key={link.label}
                href={`${dashboardUrl}${link.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 rounded-md bg-[#1A1A1A] border border-[#333333] hover:border-emerald-500/40 hover:bg-[#2A2A2A] transition-all group text-sm text-gray-300 hover:text-white"
              >
                {link.label}
                <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-emerald-400" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
