'use client';

import { Users, Home, Key, Shield, FileText, Settings, Activity, Database, Server, Cpu, BarChart3, FileSignature, Image, BookOpen, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { DashboardLayout } from '@/components/dashboard';
import type { AdminStats } from '@/lib/actions/dashboard';
import { SystemGrowthChart } from '@/components/dashboard/SystemGrowthChart';
import { ActivityLogTable } from '@/components/dashboard/ActivityLogTable';

const BASE = '/superadmin';

export default function SuperadminDashboardClient({
  stats,
  userName,
}: {
  stats: AdminStats;
  userName?: string;
}) {
  const summaryRows = [
    { label: '總用戶/活躍用戶/在線用戶數', value: `${stats.totalUsers} / ${stats.activeUsersCount} / ${stats.onlineUsersCount}` },
    { label: '總群組數', value: stats.totalGroups },
    { label: '總角色數', value: stats.totalRoles },
    { label: 'superadmin 數', value: stats.superadminCount },
  ] as const;

  const propertyRows = [
    { label: '總物件數（含有效與無效）', value: stats.totalProperties },
    { label: '目前在售物件數', value: stats.totalSales },
    { label: '目前在租物件數', value: stats.totalRentals },
    { label: '總部落格數', value: stats.totalBlogs },
  ] as const;

  const salesOverviewRows = [
    { label: '在售物件調查報告書數 / 在售物件數', num: stats.surveyReportCountForSales, denom: stats.totalSales },
    { label: '預覽買賣合約數 / 在售物件數', num: stats.salesContractsCount, denom: stats.totalSales },
    { label: '在售物件部落格數 / 在售物件數', num: stats.salesBlogCount, denom: stats.totalSales },
    { label: '逾期案出售物件數', value: stats.overdueSalesCount },
    { label: '成交出售物件數', value: stats.soldSalesCount },
  ] as const;

  const rentalOverviewRows = [
    { label: '在租物件調查報告書數 / 在租物件數', num: stats.surveyReportCountForRentals, denom: stats.totalRentals },
    { label: '預覽租賃合約數 / 在租物件數', num: stats.leaseContractsCount, denom: stats.totalRentals },
    { label: '在租物件部落格數 / 在租物件數', num: stats.rentalBlogCount, denom: stats.totalRentals },
  ] as const;

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="超級管理員儀表板"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: `${BASE}` },
        { label: '儀表板' },
      ]}
      greeting={
          userName ? (
            <>
              歡迎回來，超級管理員，
              <span className="text-accent font-semibold text-base">{userName}</span>
            </>
          ) : (
            '歡迎回來，超級管理員'
          )
        }
      headerActions={
        <Link href={`${BASE}/settings`}>
          <Button>
            <Settings className="w-5 h-5 mr-2" />
            系統設定
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 hover:border-accent/50 transition-all">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-bg-tertiary">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-sm font-medium text-text-secondary">IAM用戶群組概覽</h3>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {summaryRows.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{label}</span>
                <span className="font-semibold text-text-primary">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border-default space-y-1">
            <Link
              href={`${BASE}/users`}
              className="text-sm text-accent hover:underline block"
            >
              管理用戶
            </Link>
            <Link
              href={`${BASE}/groups`}
              className="text-sm text-accent hover:underline block"
            >
              群組管理
            </Link>
          </div>
        </Card>
        <Card className="p-6 hover:border-accent/50 transition-all">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-bg-tertiary">
                <Home className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-sm font-medium text-text-secondary">物件與部落格概覽</h3>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {propertyRows.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{label}</span>
                <span className="font-semibold text-text-primary">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border-default space-y-1">
            <Link
              href={`${BASE}/properties`}
              className="text-sm text-accent hover:underline block"
            >
              查看所有物件
            </Link>
          </div>
        </Card>
        <Card className="p-6 hover:border-accent/50 transition-all">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-bg-tertiary">
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-sm font-medium text-text-secondary">出售物件概覽</h3>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {salesOverviewRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm gap-2">
                <span className="text-text-muted shrink-0">{row.label}</span>
                <span className="font-semibold text-text-primary whitespace-nowrap">
                  {'value' in row ? row.value : (row.denom === 0 ? '0' : `${row.num} / ${row.denom}`)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border-default space-y-1">
            <Link
              href={`${BASE}/properties`}
              className="text-sm text-accent hover:underline block"
            >
              查看所有出售物件
            </Link>
          </div>
        </Card>
        <Card className="p-6 hover:border-accent/50 transition-all">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-bg-tertiary">
                <Key className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-sm font-medium text-text-secondary">出租物件概覽</h3>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {rentalOverviewRows.map(({ label, num, denom }) => (
              <div key={label} className="flex items-center justify-between text-sm gap-2">
                <span className="text-text-muted shrink-0">{label}</span>
                <span className="font-semibold text-text-primary whitespace-nowrap">
                  {denom === 0 ? '0' : `${num} / ${denom}`}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border-default space-y-1">
            <Link
              href={`${BASE}/leases`}
              className="text-sm text-accent hover:underline block"
            >
              查看所有出租物件
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 hover:border-accent/50 transition-all">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-bg-tertiary">
                <FileSignature className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-sm font-medium text-text-secondary">物件合約概況</h3>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">尚未完成預覽合約的在售物件數</span>
              <span className="font-semibold text-text-primary">{Math.max(0, stats.totalSales - stats.salesContractsCount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">尚未完成預覽合約的在租物件數</span>
              <span className="font-semibold text-text-primary">{Math.max(0, stats.totalRentals - stats.leaseContractsCount)}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border-default space-y-1">
            <Link href={`${BASE}/properties`} className="text-sm text-accent hover:underline block">查看合約</Link>
          </div>
        </Card>
        <Card className="p-6 hover:border-accent/50 transition-all">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-bg-tertiary">
                <Image className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-sm font-medium text-text-secondary">物件照片概況</h3>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">尚未完成拍照的在售物件數</span>
              <span className="font-semibold text-text-primary">{stats.salesWithoutPhotoCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">尚未完成拍照的在租物件數</span>
              <span className="font-semibold text-text-primary">{stats.rentalsWithoutPhotoCount}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border-default space-y-1">
            <Link href={`${BASE}/properties`} className="text-sm text-accent hover:underline block">查看物件照片</Link>
          </div>
        </Card>
        <Card className="p-6 hover:border-accent/50 transition-all">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-bg-tertiary">
                <BookOpen className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-sm font-medium text-text-secondary">物件部落格概況</h3>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">尚未完成行銷部落格的在售物件數</span>
              <span className="font-semibold text-text-primary">{stats.salesWithoutBlogCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">尚未完成行銷部落格的出租物件數</span>
              <span className="font-semibold text-text-primary">{stats.rentalsWithoutBlogCount}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border-default space-y-1">
            <Link href={`${BASE}/properties`} className="text-sm text-accent hover:underline block">查看部落格</Link>
          </div>
        </Card>
        <Card className="p-6 hover:border-accent/50 transition-all">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-bg-tertiary">
                <CircleCheck className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-sm font-medium text-text-secondary">逾期案概況</h3>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">逾期出售案數</span>
              <span className="font-semibold text-text-primary">{stats.overdueSalesCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">逾期出租案數</span>
              <span className="font-semibold text-text-primary">{stats.overdueRentalsCount}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border-default space-y-1">
            <Link href={`${BASE}/properties`} className="text-sm text-accent hover:underline block">查看結案</Link>
          </div>
        </Card>
      </div>

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
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center gap-3">
                        <Server className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-secondary">API 伺服器</span>
                    </div>
                    <span className="text-sm font-medium text-green-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        正常運作
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-secondary">資料庫連線</span>
                    </div>
                    <span className="text-sm font-medium text-green-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        已連線 (12ms)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center gap-3">
                        <Cpu className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-secondary">CPU 使用率</span>
                    </div>
                    <span className="text-sm font-medium text-text-primary">12%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center gap-3">
                        <Server className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-secondary">記憶體使用</span>
                    </div>
                    <span className="text-sm font-medium text-text-primary">4.2 GB / 16 GB</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                     <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-secondary">儲存空間</span>
                    </div>
                    <span className="text-sm font-medium text-text-primary">45.2 GB / 1 TB</span>
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
                className="flex items-center gap-3 p-4 rounded-lg border border-border-default hover:border-accent hover:bg-accent/5 transition-colors group"
                >
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20">
                    <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <h4 className="text-text-primary font-medium">用戶管理</h4>
                    <p className="text-sm text-text-secondary">管理系統用戶</p>
                </div>
                </Link>
                <Link
                href={`${BASE}/groups`}
                className="flex items-center gap-3 p-4 rounded-lg border border-border-default hover:border-accent hover:bg-accent/5 transition-colors group"
                >
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20">
                    <Shield className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                    <h4 className="text-text-primary font-medium">權限群組</h4>
                    <p className="text-sm text-text-secondary">角色存取控制</p>
                </div>
                </Link>
                <Link
                href={`${BASE}/dashboard/role_access_matrix`}
                className="flex items-center gap-3 p-4 rounded-lg border border-border-default hover:border-accent hover:bg-accent/5 transition-colors group"
                >
                <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center group-hover:bg-indigo-500/20">
                    <Shield className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                    <h4 className="text-text-primary font-medium">權限矩陣</h4>
                    <p className="text-sm text-text-secondary">權限總覽</p>
                </div>
                </Link>
                <Link
                href={`${BASE}/dashboard/supabase`}
                className="flex items-center gap-3 p-4 rounded-lg border border-border-default hover:border-accent hover:bg-accent/5 transition-colors group"
                >
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20">
                    <Database className="w-5 h-5 text-green-500" />
                </div>
                <div>
                    <h4 className="text-text-primary font-medium">Supabase 管理</h4>
                    <p className="text-sm text-text-secondary">資料庫監控</p>
                </div>
                </Link>
                <Link
                href={`${BASE}/logs`}
                className="flex items-center gap-3 p-4 rounded-lg border border-border-default hover:border-accent hover:bg-accent/5 transition-colors group"
                >
                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center group-hover:bg-yellow-500/20">
                    <FileText className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                    <h4 className="text-text-primary font-medium">系統日誌</h4>
                    <p className="text-sm text-text-secondary">查看操作記錄</p>
                </div>
                </Link>
            </CardContent>
            </Card>
         </div>
      </div>
    </DashboardLayout>
  );
}
