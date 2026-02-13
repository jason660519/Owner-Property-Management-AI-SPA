/**
 * @file page.tsx
 * @created 2026-02-13
 * @description Agent Dashboard - For Real Estate Agents
 */

'use client'

import { useEffect, useState } from 'react'
import { Home, FileText, Calendar, DollarSign, Plus, Users, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Link from 'next/link'
import {
  DashboardLayout,
  StatsGrid,
  type KPIConfig,
  type KPILoadingState,
} from '@/components/dashboard'
import { getAgentDashboardStats, type AgentDashboardStats } from '@/lib/actions/dashboard'

export default function AgentDashboardPage() {
  const [stats, setStats] = useState<AgentDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      try {
        const data = await getAgentDashboardStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch agent dashboard stats:', error)
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
      title: '活躍物件',
      value: stats?.activeListings || 0,
      icon: Home,
      color: 'text-blue-500',
      progressLinks: [
        {
          label: '管理物件',
          href: '/agent/listings',
        },
        {
          label: '新增物件',
          href: '/agent/listings/add',
        },
      ],
    },
    {
      title: '待審核申請',
      value: stats?.pendingApplications || 0,
      icon: FileText,
      color: 'text-orange-500',
      progressLinks: [
        {
          label: '查看申請',
          href: '/agent/applications',
          badge: stats && stats.pendingApplications > 0 ? {
            count: stats.pendingApplications,
            variant: 'warning',
          } : undefined,
        },
      ],
    },
    {
      title: '即將看房',
      value: stats?.upcomingViewings || 0,
      icon: Calendar,
      color: 'text-purple-500',
      progressLinks: [
        {
          label: '行事曆',
          href: '/agent/calendar',
        },
        {
          label: '今日行程',
          href: '/agent/calendar/today',
        },
      ],
    },
    {
      title: '本月佣金',
      value: stats ? formatCurrency(stats.totalCommission) : 'NT$ 0',
      icon: DollarSign,
      color: 'text-green-500',
      trend: {
        value: stats?.thisMonthDeals || 0,
        label: '本月成交',
        direction: 'up'
      },
      progressLinks: [
        {
          label: '業績報表',
          href: '/agent/performance',
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
      currentRole="agent"
      pageTitle="經紀人儀表板"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '經紀人專區', href: '/agent' },
        { label: '儀表板' },
      ]}
      greeting="歡迎回來，祝您今日成交順利！"
      headerActions={
        <Link href="/agent/listings/add">
          <Button>
            <Plus className="w-5 h-5 mr-2" />
            新增物件
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
              href="/agent/listings/add"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-[#7C3AED]/10 rounded-lg flex items-center justify-center group-hover:bg-[#7C3AED]/20">
                <Plus className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <div>
                <h4 className="text-white font-medium">上架新物件</h4>
                <p className="text-sm text-[#999999]">建立新的租賃或買賣物件</p>
              </div>
            </Link>

            <Link
              href="/agent/applications"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center group-hover:bg-orange-500/20">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">審核申請</h4>
                <p className="text-sm text-[#999999]">{stats?.pendingApplications || 0} 筆待處理</p>
              </div>
            </Link>

            <Link
              href="/agent/clients"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">客戶管理</h4>
                <p className="text-sm text-[#999999]">{stats?.clientCount || 0} 位活躍客戶</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity (Mock) */}
        <Card>
          <CardHeader>
            <CardTitle>最近動態</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  message: '收到新的看房預約：信義區豪宅',
                  time: '15 分鐘前',
                  color: 'text-purple-500',
                },
                {
                  message: '李先生提交了租賃申請',
                  time: '1 小時前',
                  color: 'text-orange-500',
                },
                {
                  message: '「中山區套房」物件已上架',
                  time: '3 小時前',
                  color: 'text-blue-500',
                },
                {
                  message: '恭喜！本月業績目標達成 80%',
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
