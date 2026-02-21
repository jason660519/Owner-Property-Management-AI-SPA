'use client';

import {
  Database,
  ExternalLink,
  Activity,
  Shield,
  Users,
  Table2,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

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

interface SupabaseDashboardClientProps {
  healthy: boolean;
  tablestats: TableStat[];
  rlsPolicies: RLSPolicy[];
  userCount: number;
  projectRef: string;
  supabaseUrl: string;
}

export default function SupabaseDashboardClient({
  healthy,
  tablestats,
  rlsPolicies,
  userCount,
  projectRef,
  supabaseUrl,
}: SupabaseDashboardClientProps) {
  const dashboardUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}`
    : 'https://supabase.com/dashboard';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-[#1A1A1A] min-h-screen text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Database className="h-7 w-7 text-emerald-400" />
            Supabase 資料庫管理
          </h1>
          {supabaseUrl && (
            <p className="text-gray-500 text-xs mt-1 font-mono">{supabaseUrl}</p>
          )}
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

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="p-3 rounded-lg bg-purple-500/10">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">群組成員記錄</p>
              <p className="text-2xl font-bold text-white mt-1">{userCount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Stats */}
      <Card className="bg-[#2A2A2A] border-[#333333]">
        <CardHeader className="border-b border-[#333333] pb-4">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Table2 className="w-4 h-4 text-blue-400" />
            資料表記錄數
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-[#333333] text-gray-400 text-xs">
                <tr>
                  <th className="px-4 py-3">Schema</th>
                  <th className="px-4 py-3">資料表名稱</th>
                  <th className="px-4 py-3 text-right">記錄數（估計）</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {tablestats.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      無法取得資料表資訊
                    </td>
                  </tr>
                ) : (
                  tablestats
                    .sort((a, b) => b.n_live_tup - a.n_live_tup)
                    .map(t => (
                      <tr key={t.tablename} className="hover:bg-[#333333]/50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">{t.schemaname}</td>
                        <td className="px-4 py-3 font-mono text-sm text-white">{t.tablename}</td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {t.n_live_tup.toLocaleString()}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* RLS Policies (if available) */}
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
                  {rlsPolicies.map((p, i) => (
                    <tr key={i} className="hover:bg-[#333333]/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-white">{p.tablename}</td>
                      <td className="px-4 py-3 text-gray-300 text-xs">{p.policyname}</td>
                      <td className="px-4 py-3 text-blue-400 text-xs">{p.cmd}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {Array.isArray(p.roles) ? p.roles.join(', ') : String(p.roles)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
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
            ].map(link => (
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
