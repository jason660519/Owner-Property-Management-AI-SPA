/**
 * @file page.tsx
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Contracted Tenant Dashboard - For tenants with signed rental contracts
 */

'use client'

import { useEffect, useState } from 'react'
import { FileText, DollarSign, Wrench, Bell, Plus, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Link from 'next/link'
import {
  DashboardLayout,
  StatsGrid,
  type KPIConfig,
  type KPILoadingState,
} from '@/components/dashboard'

interface TenantStats {
  leaseEndDate: string // ISO date string
  monthlyRent: number
  depositStatus: 'paid' | 'unpaid' | 'refunding'
  currentMonthDue: number
  paymentsMade: number
  totalPayments: number
  overdueCount: number
  nextPaymentDate: string // ISO date string
  maintenancePending: number
  maintenanceInProgress: number
  maintenanceCompleted: number
  unreadNotifications: number
}

export default function ContractedTenantDashboardPage() {
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // TODO: 從 Supabase 查詢實際數據
    // 目前使用模擬數據
    const fetchStats = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setStats({
        leaseEndDate: '2026-12-31',
        monthlyRent: 25000,
        depositStatus: 'paid',
        currentMonthDue: 25000,
        paymentsMade: 8,
        totalPayments: 12,
        overdueCount: 0,
        nextPaymentDate: '2026-03-01',
        maintenancePending: 1,
        maintenanceInProgress: 1,
        maintenanceCompleted: 5,
        unreadNotifications: 3,
      })
      setIsLoading(false)
    }

    fetchStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  const getDaysUntil = (dateString: string) => {
    const today = new Date()
    const targetDate = new Date(dateString)
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const leaseEndDays = stats ? getDaysUntil(stats.leaseEndDate) : 0
  const nextPaymentDays = stats ? getDaysUntil(stats.nextPaymentDate) : 0

  // KPI configurations
  const kpis: KPIConfig[] = [
    {
      title: '當前租約狀態',
      value: stats ? `${leaseEndDays} 天到期` : '-',
      icon: FileText,
      color: 'text-blue-500',
      trend: stats && leaseEndDays < 30 ? {
        value: 30 - leaseEndDays,
        direction: 'down',
        label: '距到期日',
      } : undefined,
      progressLinks: [
        {
          label: '查看租約詳情',
          href: '/tenant/leases/current',
        },
        {
          label: '續約申請',
          href: '/tenant/leases/renew',
        },
      ],
    },
    {
      title: '繳款狀態',
      value: stats ? formatCurrency(stats.currentMonthDue) : 'NT$ 0',
      icon: DollarSign,
      color: 'text-green-500',
      progressLinks: [
        {
          label: '查看繳款記錄',
          href: '/tenant/payments',
          badge: {
            count: stats?.paymentsMade || 0,
            variant: 'success',
          },
        },
        {
          label: '立即繳款',
          href: '/tenant/payments/new',
          badge: stats && stats.overdueCount > 0 ? {
            count: stats.overdueCount,
            variant: 'error',
          } : undefined,
        },
      ],
    },
    {
      title: '維修申請',
      value: stats
        ? stats.maintenancePending + stats.maintenanceInProgress
        : 0,
      icon: Wrench,
      color: 'text-orange-500',
      progressLinks: [
        {
          label: '查看所有申請',
          href: '/tenant/maintenance',
          badge: stats && stats.maintenancePending > 0 ? {
            count: stats.maintenancePending,
            variant: 'warning',
          } : undefined,
        },
        {
          label: '提交新申請',
          href: '/tenant/maintenance/new',
        },
      ],
    },
    {
      title: '通知訊息',
      value: stats?.unreadNotifications || 0,
      icon: Bell,
      color: 'text-purple-500',
      progressLinks: [
        {
          label: '查看所有通知',
          href: '/tenant/notifications',
          badge: stats && stats.unreadNotifications > 0 ? {
            count: stats.unreadNotifications,
            variant: 'info',
          } : undefined,
        },
      ],
    },
  ]

  const kpiLoadingStates: KPILoadingState[] = kpis.map(() => ({
    isLoading,
    isEmpty: !stats,
  }))

  return (
    <DashboardLayout
      currentRole="contracted_tenant"
      pageTitle="簽約租客儀表板"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '租客專區', href: '/tenant' },
        { label: '簽約儀表板' },
      ]}
      greeting={stats ? `租約到期日：${formatDate(stats.leaseEndDate)}` : '載入中...'}
      headerActions={
        <Link href="/tenant/maintenance/new">
          <Button>
            <Plus className="w-5 h-5 mr-2" />
            報修申請
          </Button>
        </Link>
      }
    >
      {/* KPI Stats Grid */}
      <StatsGrid kpis={kpis} loading={kpiLoadingStates} columns={4} className="mb-8" />

      {/* Quick Actions & Lease Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lease Information */}
        <Card>
          <CardHeader>
            <CardTitle>租約資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats ? (
              <>
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">月租金</span>
                  <span className="text-lg font-bold text-white">
                    {formatCurrency(stats.monthlyRent)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">押金狀態</span>
                  <span className="text-sm font-medium text-green-500">
                    {stats.depositStatus === 'paid' && '已繳納'}
                    {stats.depositStatus === 'unpaid' && '未繳納'}
                    {stats.depositStatus === 'refunding' && '退還中'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">繳款進度</span>
                  <span className="text-sm font-medium text-white">
                    {stats.paymentsMade} / {stats.totalPayments} 期
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">下次繳款日</span>
                  <span className="text-sm font-medium text-yellow-500">
                    {formatDate(stats.nextPaymentDate)} ({nextPaymentDays} 天)
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-[#666666]">載入中...</div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/tenant/payments/new"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">繳納租金</h4>
                <p className="text-sm text-[#999999]">
                  本月應繳：{stats ? formatCurrency(stats.currentMonthDue) : 'NT$ 0'}
                </p>
              </div>
            </Link>

            <Link
              href="/tenant/maintenance/new"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center group-hover:bg-orange-500/20">
                <Wrench className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">報修申請</h4>
                <p className="text-sm text-[#999999]">
                  {stats?.maintenancePending || 0} 個待處理
                </p>
              </div>
            </Link>

            <Link
              href="/tenant/leases/renew"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20">
                <CalendarIcon className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">續約申請</h4>
                <p className="text-sm text-[#999999]">
                  租約將於 {stats ? leaseEndDays : 0} 天後到期
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
