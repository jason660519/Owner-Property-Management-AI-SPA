/**
 * @file page.tsx
 * @created 2026-02-13
 * @description Service Provider Dashboard - For Vendors and Maintenance Staff
 */

'use client'

import { useEffect, useState } from 'react'
import { Wrench, Calendar, DollarSign, Star, ClipboardList, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Link from 'next/link'
import {
  DashboardLayout,
  StatsGrid,
  type KPIConfig,
  type KPILoadingState,
} from '@/components/dashboard'
import { getServiceProviderDashboardStats, type ServiceProviderStats } from '@/lib/actions/dashboard'

export default function ServiceProviderDashboardPage() {
  const [stats, setStats] = useState<ServiceProviderStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      try {
        const data = await getServiceProviderDashboardStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch service provider dashboard stats:', error)
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
      title: '待處理工單',
      value: stats?.openWorkOrders || 0,
      icon: Wrench,
      color: 'text-orange-500',
      progressLinks: [
        {
          label: '查看工單',
          href: '/service-provider/work-orders',
          badge: stats && stats.openWorkOrders > 0 ? {
            count: stats.openWorkOrders,
            variant: 'warning',
          } : undefined,
        },
      ],
    },
    {
      title: '今日行程',
      value: stats?.todayScheduleCount || 0,
      icon: Calendar,
      color: 'text-blue-500',
      progressLinks: [
        {
          label: '行程表',
          href: '/service-provider/schedule',
        },
      ],
    },
    {
      title: '本月收益',
      value: stats ? formatCurrency(stats.earningsMonth) : 'NT$ 0',
      icon: DollarSign,
      color: 'text-green-500',
      progressLinks: [
        {
          label: '財務報表',
          href: '/service-provider/finance',
        },
      ],
    },
    {
      title: '服務評分',
      value: stats?.averageRating || 0,
      icon: Star,
      color: 'text-yellow-500',
      progressLinks: [
        {
          label: '查看評價',
          href: '/service-provider/reviews',
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
      currentRole="service_provider"
      pageTitle="服務商儀表板"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '服務商專區', href: '/service-provider' },
        { label: '儀表板' },
      ]}
      greeting="早安！準備好開始今天的工作了嗎？"
      headerActions={
        <Link href="/service-provider/work-orders">
          <Button>
            <ClipboardList className="w-5 h-5 mr-2" />
            工單列表
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
              href="/service-provider/work-orders"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center group-hover:bg-orange-500/20">
                <Wrench className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">更新工單進度</h4>
                <p className="text-sm text-[#999999]">回報維修狀況與照片</p>
              </div>
            </Link>

            <Link
              href="/service-provider/quotes"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20">
                <ClipboardList className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">待報價項目</h4>
                <p className="text-sm text-[#999999]">{stats?.pendingQuotes || 0} 筆待報價</p>
              </div>
            </Link>

            <Link
              href="/service-provider/finance"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">請款管理</h4>
                <p className="text-sm text-[#999999]">查看已完成工單並請款</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Today's Schedule (Mock) */}
        <Card>
          <CardHeader>
            <CardTitle>今日行程</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  time: '09:00 AM',
                  title: '冷氣維修 - 大安區',
                  status: '已完成',
                  color: 'text-green-500',
                },
                {
                  time: '11:30 AM',
                  title: '水管漏水檢查 - 中山區',
                  status: '進行中',
                  color: 'text-blue-500',
                },
                {
                  time: '03:00 PM',
                  title: '更換門鎖 - 信義區',
                  status: '未開始',
                  color: 'text-gray-500',
                },
              ].map((job, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-[#999999]">{job.time}</span>
                    <span className="text-white font-medium">{job.title}</span>
                  </div>
                  <span className={`text-sm ${job.color}`}>{job.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
