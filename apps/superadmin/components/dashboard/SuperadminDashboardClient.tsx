'use client';

import { Users, Home, Key, Shield, FileText, Settings, Activity, Database, Server, Cpu } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  DashboardLayout,
  StatsGrid,
  type KPIConfig,
  type KPILoadingState,
} from '@/components/dashboard';
import type { AdminStats } from '@/lib/actions/dashboard';
import { SystemGrowthChart } from '@/components/dashboard/SystemGrowthChart';
import { ActivityLogTable } from '@/components/dashboard/ActivityLogTable';

const BASE = '/superadmin';

export default function SuperadminDashboardClient({ stats }: { stats: AdminStats }) {
  const kpis: KPIConfig[] = [
    {
      title: '總用戶數',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-500',
      progressLinks: [
        { label: '管理用戶', href: `${BASE}/users` },
        { label: '群組管理', href: `${BASE}/groups` },
      ],
    },
    {
      title: '總物件數',
      value: stats.totalProperties,
      icon: Home,
      color: 'text-green-500',
      progressLinks: [{ label: '查看所有物件', href: `${BASE}/properties` }],
    },
    {
      title: '活躍租賃',
      value: stats.activeRentals,
      icon: Key,
      color: 'text-purple-500',
      progressLinks: [{ label: '查看租約', href: `${BASE}/leases` }],
    },
    {
      title: '系統待辦',
      value: stats.pendingVerifications,
      icon: Shield,
      color: 'text-orange-500',
      progressLinks: [
        {
          label: '審核申請',
          href: `${BASE}/verifications`,
          badge:
            stats.pendingVerifications > 0
              ? { count: stats.pendingVerifications, variant: 'warning' as const }
              : undefined,
        },
      ],
    },
  ];

  const kpiLoadingStates: KPILoadingState[] = kpis.map(() => ({ isLoading: false, isEmpty: false }));

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="超級管理員儀表板"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: `${BASE}` },
        { label: '儀表板' },
      ]}
      greeting="歡迎回來，系統管理員"
      headerActions={
        <Link href={`${BASE}/settings`}>
          <Button>
            <Settings className="w-5 h-5 mr-2" />
            系統設定
          </Button>
        </Link>
      }
    >
      <StatsGrid kpis={kpis} loading={kpiLoadingStates} columns={4} className="mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
            <SystemGrowthChart />
        </div>
        <div className="lg:col-span-1">
             <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    系統健康狀態
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                    <div className="flex items-center gap-3">
                        <Server className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-[#999999]">API 伺服器</span>
                    </div>
                    <span className="text-sm font-medium text-green-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        正常運作
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                    <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-[#999999]">資料庫連線</span>
                    </div>
                    <span className="text-sm font-medium text-green-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        已連線 (12ms)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                    <div className="flex items-center gap-3">
                        <Cpu className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-[#999999]">CPU 使用率</span>
                    </div>
                    <span className="text-sm font-medium text-white">12%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                    <div className="flex items-center gap-3">
                        <Server className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-[#999999]">記憶體使用</span>
                    </div>
                    <span className="text-sm font-medium text-white">4.2 GB / 16 GB</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                     <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-[#999999]">儲存空間</span>
                    </div>
                    <span className="text-sm font-medium text-white">45.2 GB / 1 TB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2">
             <ActivityLogTable />
         </div>
         <div className="lg:col-span-1">
            <Card className="h-full">
            <CardHeader>
                <CardTitle>快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <Link
                href={`${BASE}/users`}
                className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
                >
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20">
                    <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <h4 className="text-white font-medium">用戶管理</h4>
                    <p className="text-sm text-[#999999]">管理系統用戶</p>
                </div>
                </Link>
                <Link
                href={`${BASE}/groups`}
                className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
                >
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20">
                    <Shield className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                    <h4 className="text-white font-medium">權限群組</h4>
                    <p className="text-sm text-[#999999]">角色存取控制</p>
                </div>
                </Link>
                <Link
                href={`${BASE}/dashboard/role_access_matrix`}
                className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
                >
                <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center group-hover:bg-indigo-500/20">
                    <Shield className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                    <h4 className="text-white font-medium">權限矩陣</h4>
                    <p className="text-sm text-[#999999]">權限總覽</p>
                </div>
                </Link>
                <Link
                href={`${BASE}/dashboard/supabase`}
                className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
                >
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20">
                    <Database className="w-5 h-5 text-green-500" />
                </div>
                <div>
                    <h4 className="text-white font-medium">Supabase 管理</h4>
                    <p className="text-sm text-[#999999]">資料庫監控</p>
                </div>
                </Link>
                <Link
                href={`${BASE}/logs`}
                className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
                >
                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center group-hover:bg-yellow-500/20">
                    <FileText className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                    <h4 className="text-white font-medium">系統日誌</h4>
                    <p className="text-sm text-[#999999]">查看操作記錄</p>
                </div>
                </Link>
            </CardContent>
            </Card>
         </div>
      </div>
    </DashboardLayout>
  );
}
