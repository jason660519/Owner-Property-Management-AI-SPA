/**
 * @file page.tsx
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Potential Tenant Dashboard - For users looking for rental properties
 */

'use client'

import { useEffect, useState } from 'react'
import { Heart, Calendar, Target, FileCheck, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Link from 'next/link'
import {
  DashboardLayout,
  StatsGrid,
  type KPIConfig,
  type KPILoadingState,
} from '@/components/dashboard'

interface PotentialTenantStats {
  favoritesCount: number
  favoritesThisWeek: number
  viewingsPending: number
  viewingsCompleted: number
  todayViewings: number
  thisWeekViewings: number
  budgetMin: number
  budgetMax: number
  matchingProperties: number
  applicationsInProgress: number
  applicationsAccepted: number
  applicationsRejected: number
}

export default function PotentialTenantDashboardPage() {
  const [stats, setStats] = useState<PotentialTenantStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // TODO: 從 Supabase 查詢實際數據
    // 目前使用模擬數據
    const fetchStats = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setStats({
        favoritesCount: 8,
        favoritesThisWeek: 3,
        viewingsPending: 2,
        viewingsCompleted: 5,
        todayViewings: 1,
        thisWeekViewings: 3,
        budgetMin: 15000,
        budgetMax: 25000,
        matchingProperties: 24,
        applicationsInProgress: 1,
        applicationsAccepted: 0,
        applicationsRejected: 0,
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

  // KPI configurations
  const kpis: KPIConfig[] = [
    {
      title: '收藏物件',
      value: stats?.favoritesCount || 0,
      icon: Heart,
      color: 'text-pink-500',
      trend: stats && stats.favoritesThisWeek > 0 ? {
        value: Math.round((stats.favoritesThisWeek / stats.favoritesCount) * 100),
        direction: 'up',
        label: '本週新增',
      } : undefined,
      progressLinks: [
        {
          label: '查看所有收藏',
          href: '/tenant/favorites',
          badge: stats && stats.favoritesCount > 0 ? {
            count: stats.favoritesCount,
            variant: 'info',
          } : undefined,
        },
        {
          label: '繼續瀏覽物件',
          href: '/properties',
          query: { type: 'rental' },
        },
      ],
    },
    {
      title: '看房預約',
      value: stats ? stats.viewingsPending + stats.viewingsCompleted : 0,
      icon: Calendar,
      color: 'text-blue-500',
      progressLinks: [
        {
          label: '管理預約',
          href: '/tenant/viewings',
          badge: stats && stats.viewingsPending > 0 ? {
            count: stats.viewingsPending,
            variant: 'warning',
          } : undefined,
        },
        {
          label: '預約看房',
          href: '/properties',
          query: { type: 'rental' },
        },
      ],
    },
    {
      title: '租屋評估',
      value: stats
        ? `${formatCurrency(stats.budgetMin)} - ${formatCurrency(stats.budgetMax)}`
        : '未設定',
      icon: Target,
      color: 'text-green-500',
      progressLinks: [
        {
          label: '更新預算',
          href: '/tenant/budget',
        },
        {
          label: '查看推薦物件',
          href: '/tenant/recommendations',
          badge: stats && stats.matchingProperties > 0 ? {
            count: stats.matchingProperties,
            variant: 'success',
          } : undefined,
        },
      ],
    },
    {
      title: '申請進度',
      value: stats?.applicationsInProgress || 0,
      icon: FileCheck,
      color: 'text-purple-500',
      progressLinks: [
        {
          label: '查看申請',
          href: '/tenant/applications',
          badge: stats && stats.applicationsInProgress > 0 ? {
            count: stats.applicationsInProgress,
            variant: 'info',
          } : undefined,
        },
        {
          label: '提交新申請',
          href: '/properties',
          query: { type: 'rental' },
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
      currentRole="potential_tenant"
      pageTitle="潛在租客儀表板"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '租客專區', href: '/tenant' },
        { label: '潛在儀表板' },
      ]}
      greeting={
        stats
          ? `目前預算範圍：${formatCurrency(stats.budgetMin)} - ${formatCurrency(stats.budgetMax)}`
          : '載入中...'
      }
      headerActions={
        <Link href="/properties?type=rental">
          <Button>
            <Search className="w-5 h-5 mr-2" />
            搜尋物件
          </Button>
        </Link>
      }
    >
      {/* KPI Stats Grid */}
      <StatsGrid kpis={kpis} loading={kpiLoadingStates} columns={4} className="mb-8" />

      {/* Quick Actions & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Settings */}
        <Card>
          <CardHeader>
            <CardTitle>預算設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats ? (
              <>
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">預算範圍</span>
                  <span className="text-lg font-bold text-white">
                    {formatCurrency(stats.budgetMin)} - {formatCurrency(stats.budgetMax)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">符合條件物件</span>
                  <span className="text-sm font-medium text-green-500">
                    {stats.matchingProperties} 個
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">本週預約</span>
                  <span className="text-sm font-medium text-white">
                    {stats.thisWeekViewings} 個
                  </span>
                </div>
                <Link href="/tenant/budget">
                  <Button variant="outline" className="w-full mt-2">
                    <Target className="w-4 h-4 mr-2" />
                    更新預算設定
                  </Button>
                </Link>
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
              href="/properties?type=rental"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20">
                <Search className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">搜尋租屋</h4>
                <p className="text-sm text-[#999999]">
                  {stats?.matchingProperties || 0} 個符合條件
                </p>
              </div>
            </Link>

            <Link
              href="/tenant/favorites"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center group-hover:bg-pink-500/20">
                <Heart className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">我的收藏</h4>
                <p className="text-sm text-[#999999]">
                  {stats?.favoritesCount || 0} 個收藏物件
                </p>
              </div>
            </Link>

            <Link
              href="/tenant/viewings"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20">
                <Calendar className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">看房預約</h4>
                <p className="text-sm text-[#999999]">
                  {stats?.viewingsPending || 0} 個待確認
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
