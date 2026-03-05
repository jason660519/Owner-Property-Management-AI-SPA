'use client';

import { useEffect, useState } from 'react';
import { Users, Home, Key, Shield, FileText, Settings, Activity, Database, Server, Cpu, BarChart3, FileSignature, Image, BookOpen, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { DashboardLayout } from '@/components/dashboard';
import type { AdminStats } from '@/lib/actions/dashboard-types';
import type { SystemHealthResponse } from '@/app/api/system-health/route';
import { SystemGrowthChart } from '@/components/dashboard/SystemGrowthChart';
import { ActivityLogTable } from '@/components/dashboard/ActivityLogTable';

const BASE = '/superadmin';

export default function SuperadminDashboardClient({
  stats,
  userName,
  loadError,
}: {
  stats: AdminStats;
  userName?: string;
  /** 當儀表板資料載入失敗時顯示的訊息（不觸發 error boundary） */
  loadError?: string;
}) {
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(null);
  const [systemHealthError, setSystemHealthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/system-health');
        if (!res.ok) {
          throw new Error(`Failed to fetch system health: ${res.status}`);
        }
        const data = (await res.json()) as SystemHealthResponse;
        if (!cancelled) {
          setSystemHealth(data);
          setSystemHealthError(null);
        }
      } catch (error) {
        console.error('[SuperadminDashboard] Failed to fetch system health:', error);
        if (!cancelled) {
          setSystemHealth(null);
          setSystemHealthError('無法載入系統健康狀態');
        }
      }
    };

    fetchHealth();
    const intervalId = setInterval(fetchHealth, 15000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);
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
      pageTitle="系統概覽"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: `${BASE}` },
        { label: '系統概覽' },
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
      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400" role="alert">
          資料暫時無法完整載入。{loadError}
        </div>
      )}
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
                {label === '總用戶/活躍用戶/在線用戶數' ? (
                  <Link href={`${BASE}/users`} className="text-text-muted hover:text-accent hover:underline">
                    {label}
                  </Link>
                ) : label === '總群組數' ? (
                  <Link href={`${BASE}/groups`} className="text-text-muted hover:text-accent hover:underline">
                    {label}
                  </Link>
                ) : (
                  <span className="text-text-muted">{label}</span>
                )}
                <span className="font-semibold text-text-primary">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border-default space-y-1">
            <Link href={`${BASE}/users`} className="text-sm text-accent hover:underline block">查看 用戶管理</Link>
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
                {label === '總物件數（含有效與無效）' ? (
                  <Link href={`${BASE}/properties`} className="text-text-muted hover:text-accent hover:underline">
                    {label}
                  </Link>
                ) : (
                  <span className="text-text-muted">{label}</span>
                )}
                <span className="font-semibold text-text-primary">{value}</span>
              </div>
            ))}
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
            <Link href={`${BASE}/properties`} className="text-sm text-accent hover:underline block">查看 物件管理</Link>
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
            <Link href={`${BASE}/properties`} className="text-sm text-accent hover:underline block">查看 物件管理</Link>
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
            <Link href={`${BASE}/properties`} className="text-sm text-accent hover:underline block">查看 物件管理</Link>
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
            <Link href={`${BASE}/properties`} className="text-sm text-accent hover:underline block">查看 物件管理</Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
            <SystemGrowthChart />
        </div>
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                系統健康狀態
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemHealthError && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                    {systemHealthError}
                  </div>
                )}

                {!systemHealth && !systemHealthError && (
                  <div className="text-sm text-text-muted">載入中...</div>
                )}

                {systemHealth && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                      <div className="flex items-center gap-3">
                        <Server className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-secondary">API 伺服器</span>
                      </div>
                      <span
                        className={`text-sm font-medium flex items-center gap-2 ${
                          systemHealth.apiServer.status === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            systemHealth.apiServer.status === 'up' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                          }`}
                        />
                        {systemHealth.apiServer.message}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                      <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-secondary">資料庫連線</span>
                      </div>
                      <span
                        className={`text-sm font-medium flex items-center gap-2 ${
                          systemHealth.database.status === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            systemHealth.database.status === 'up' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                          }`}
                        />
                        {systemHealth.database.status === 'up'
                          ? `已連線 (${systemHealth.database.latencyMs ?? 0}ms)`
                          : '連線失敗'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                      <div className="flex items-center gap-3">
                        <Cpu className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-secondary">CPU 使用率</span>
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        {systemHealth.cpu.usagePercent !== null ? `${systemHealth.cpu.usagePercent}%` : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                      <div className="flex items-center gap-3">
                        <Server className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-secondary">記憶體使用</span>
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        {systemHealth.memory.usedGb !== null && systemHealth.memory.totalGb !== null
                          ? `${systemHealth.memory.usedGb} GB / ${systemHealth.memory.totalGb} GB`
                          : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                      <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-secondary">儲存空間</span>
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        {systemHealth.disk.usedGb !== null && systemHealth.disk.totalGb !== null
                          ? `${systemHealth.disk.usedGb} GB / ${systemHealth.disk.totalGb} GB`
                          : '—'}
                      </span>
                    </div>

                    {systemHealth.extraDisks.length > 0 && (
                      <div className="border-t border-border-default pt-3 mt-1 space-y-1">
                        <div className="text-xs font-medium text-text-secondary">外接磁碟 / 其他磁碟</div>
                        <div className="space-y-1">
                          {systemHealth.extraDisks.map((disk) => (
                            <div key={disk.mountPoint ?? 'unknown'} className="flex items-center justify-between text-xs text-text-secondary">
                              <span className="truncate max-w-[55%]">
                                {disk.mountPoint
                                  ? disk.mountPoint.startsWith('/Volumes/')
                                    ? disk.mountPoint.replace('/Volumes/', '')
                                    : disk.mountPoint
                                  : '未知掛載點'}
                              </span>
                              <span className="font-medium text-text-primary">
                                {disk.usedGb !== null && disk.totalGb !== null
                                  ? `${disk.usedGb} GB / ${disk.totalGb} GB`
                                  : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                開發服務連線狀態
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!systemHealth && !systemHealthError && (
                <div className="text-sm text-text-muted">載入中...</div>
              )}

              {systemHealth && (
                <div className="space-y-2">
                  {systemHealth.devServices.map((svc) => (
                    <div key={svc.name} className="flex items-center justify-between rounded-lg bg-bg-tertiary px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-text-secondary">{svc.name}</span>
                        <span className="text-[11px] text-text-muted truncate max-w-[180px]">{svc.url}</span>
                      </div>
                      <span
                        className={`text-xs font-semibold flex items-center gap-1 ${
                          svc.status === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            svc.status === 'up' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                          }`}
                        />
                        {svc.status === 'up' ? '正常' : '無法連線'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <ActivityLogTable />
        </div>
      </div>
    </DashboardLayout>
  );
}
