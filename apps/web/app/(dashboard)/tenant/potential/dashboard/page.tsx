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
import { getPotentialTenantDashboardStats, type PotentialTenantStats } from '@/lib/actions/dashboard'

export default function PotentialTenantDashboardPage() {
  const [stats, setStats] = useState<PotentialTenantStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      try {
        const data = await getPotentialTenantDashboardStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  // KPI configurations
  const kpis: KPIConfig[] = [
    {
      title: '房東邀請物件',
      value: stats?.matchingProperties || 0,
      icon: Target,
      color: 'text-green-500',
      progressLinks: [
        {
          label: '查看邀請物件',
          href: '/tenant/potential/properties',
          badge: stats && stats.matchingProperties > 0 ? {
            count: stats.matchingProperties,
            variant: 'success',
          } : undefined,
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
          href: '/tenant/potential/viewings',
          badge: stats && stats.viewingsPending > 0 ? {
            count: stats.viewingsPending,
            variant: 'warning',
          } : undefined,
        },
        {
          label: '預約新看房',
          href: '/tenant/potential/properties',
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
          href: '/tenant/potential/applications',
          badge: stats && stats.applicationsInProgress > 0 ? {
            count: stats.applicationsInProgress,
            variant: 'info',
          } : undefined,
        },
      ],
    },
    {
      title: '常用資源',
      value: 'FAQ',
      icon: FileCheck, // Or another icon
      color: 'text-orange-500',
      progressLinks: [
        {
          label: '租賃常見問題',
          href: '/tenant/resources/faq',
        },
        {
          label: '查看空白租約',
          href: '/tenant/resources/blank-lease',
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
        { label: '儀表板' },
      ]}
      greeting="歡迎！查看房東為您精選的物件"
      headerActions={
        <Link href="/tenant/potential/properties">
          <Button>
            <Search className="w-5 h-5 mr-2" />
            瀏覽物件
          </Button>
        </Link>
      }
    >
      {/* KPI Stats Grid */}
      <StatsGrid kpis={kpis} loading={kpiLoadingStates} columns={4} className="mb-8" />

      {/* Quick Actions & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resources Card */}
        <Card>
          <CardHeader>
            <CardTitle>租屋資源</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                <span className="text-sm text-[#999999]">租賃合約範本</span>
                <Link href="/tenant/resources/blank-lease" className="text-sm font-medium text-blue-500 hover:underline">
                  預覽
                </Link>
             </div>
             <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                <span className="text-sm text-[#999999]">常見問題 (Q&A)</span>
                <Link href="/tenant/resources/faq" className="text-sm font-medium text-blue-500 hover:underline">
                  查看
                </Link>
             </div>
             <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 mt-4">
                <h4 className="text-blue-500 font-medium mb-2">房東留言</h4>
                <p className="text-sm text-[#cccccc]">
                  歡迎您！請瀏覽我為您準備的物件資訊。如有任何問題，請隨時透過預約看房或常見問題尋求解答。
                </p>
             </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/tenant/potential/properties"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20">
                <Search className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">瀏覽邀請物件</h4>
                <p className="text-sm text-[#999999]">
                  {stats?.matchingProperties || 0} 個物件
                </p>
              </div>
            </Link>

            <Link
              href="/tenant/potential/viewings"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20">
                <Calendar className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">預約看房</h4>
                <p className="text-sm text-[#999999]">
                  {stats?.viewingsPending || 0} 個待確認
                </p>
              </div>
            </Link>

            <Link
              href="/tenant/potential/applications"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20">
                <FileCheck className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">遞交租賃要約</h4>
                <p className="text-sm text-[#999999]">
                  申請進度查詢
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
