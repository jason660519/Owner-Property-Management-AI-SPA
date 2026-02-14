/**
 * @file page.tsx
 * @created 2026-02-13
 * @description Potential Buyer Dashboard - For users looking to buy properties
 */

'use client'

import { useEffect, useState } from 'react'
import { Heart, Calendar, DollarSign, Search, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Link from 'next/link'
import {
  DashboardLayout,
  StatsGrid,
  type KPIConfig,
  type KPILoadingState,
} from '@/components/dashboard'
import { getPotentialBuyerDashboardStats, type PotentialBuyerStats } from '@/lib/actions/dashboard'

export default function PotentialBuyerDashboardPage() {
  const [stats, setStats] = useState<PotentialBuyerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      try {
        const data = await getPotentialBuyerDashboardStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch buyer dashboard stats:', error)
      } finally {
        setIsLoading(false)
      }
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
      value: stats?.savedProperties || 0,
      icon: Heart,
      color: 'text-red-500',
      progressLinks: [
        {
          label: '查看收藏',
          href: '/buyer/potential/favorites',
        },
      ],
    },
    {
      title: '看房行程',
      value: stats?.scheduledViewings || 0,
      icon: Calendar,
      color: 'text-blue-500',
      progressLinks: [
        {
          label: '管理預約',
          href: '/buyer/potential/viewings',
          badge: stats && stats.scheduledViewings > 0 ? {
            count: stats.scheduledViewings,
            variant: 'info',
          } : undefined,
        },
      ],
    },
    {
      title: '出價狀態',
      value: stats?.activeOffers || 0,
      icon: DollarSign,
      color: 'text-green-500',
      progressLinks: [
        {
          label: '查看出價',
          href: '/buyer/potential/offers',
          badge: stats && stats.activeOffers > 0 ? {
            count: stats.activeOffers,
            variant: 'warning',
          } : undefined,
        },
      ],
    },
    {
      title: '新上架推薦',
      value: stats?.newMatches || 0,
      icon: Home,
      color: 'text-purple-500',
      progressLinks: [
        {
          label: '瀏覽推薦',
          href: '/buyer/potential/matches',
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
      currentRole="potential_buyer"
      pageTitle="潛在買家儀表板"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '買家專區', href: '/buyer' },
        { label: '儀表板' },
      ]}
      greeting="歡迎！找到您心目中的夢想家了嗎？"
      headerActions={
        <Link href="/buyer/potential/search">
          <Button>
            <Search className="w-5 h-5 mr-2" />
            搜尋物件
          </Button>
        </Link>
      }
    >
      {/* KPI Stats Grid */}
      <StatsGrid kpis={kpis} loading={kpiLoadingStates} columns={4} className="mb-8" />

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/buyer/potential/search"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-[#7C3AED]/10 rounded-lg flex items-center justify-center group-hover:bg-[#7C3AED]/20">
                <Search className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <div>
                <h4 className="text-white font-medium">搜尋物件</h4>
                <p className="text-sm text-[#999999]">依照地區、價格篩選</p>
              </div>
            </Link>

            <Link
              href="/buyer/potential/viewings"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">預約看房</h4>
                <p className="text-sm text-[#999999]">查看待確認的預約</p>
              </div>
            </Link>

            <Link
              href="/buyer/potential/calculator"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">房貸試算</h4>
                <p className="text-sm text-[#999999]">
                  預核額度：{stats ? formatCurrency(stats.preApprovedAmount) : '計算中...'}
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>最新推薦</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  message: '信義區 3 房 2 廳，降價通知',
                  time: '2 小時前',
                  color: 'text-red-500',
                },
                {
                  message: '符合您條件的新物件上架：大安區公寓',
                  time: '5 小時前',
                  color: 'text-blue-500',
                },
                {
                  message: '經紀人已確認您的看房預約',
                  time: '昨天',
                  color: 'text-green-500',
                },
              ].map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${activity.color.replace('text-', 'bg-')}`}
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.message}</p>
                    <p className="text-xs text-[#666666] mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
