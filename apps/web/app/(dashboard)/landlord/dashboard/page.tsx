/**
 * @file page.tsx
 * @created 2026-02-04
 * @lastModified 2026-02-05
 * @modifiedBy Claude Sonnet 4.5
 * @description Landlord Dashboard - Refactored with universal dashboard components
 */

'use client'

import { useEffect, useState } from 'react'
import { Home, DollarSign, TrendingUp, FileText, Plus, Calendar, CreditCard, Handshake } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Link from 'next/link'
import {
  DashboardLayout,
  StatsGrid,
  type KPIConfig,
  type KPILoadingState,
} from '@/components/dashboard'

import { getLandlordDashboardStats, type LandlordStats } from '@/lib/actions/dashboard'

export default function LandlordDashboardPage() {
  const [stats, setStats] = useState<LandlordStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      try {
        const data = await getLandlordDashboardStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
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

  const occupancyRate = stats
    ? stats.totalProperties > 0
      ? Math.round((stats.rentedProperties / stats.totalProperties) * 100)
      : 0
    : 0

  // KPI configurations using new system
  const kpis: KPIConfig[] = [
    {
      title: '總物件數',
      value: stats?.totalProperties || 0,
      icon: Home,
      color: 'text-blue-500',
      trend: {
        value: 16.7, // 2/12 * 100
        direction: 'up',
        label: '較上月',
      },
      progressLinks: [
        {
          label: '查看所有物件',
          href: '/landlord/properties',
        },
        {
          label: '新增物件',
          href: '/landlord/properties/add',
        },
      ],
    },
    {
      title: '成交客戶',
      value: stats?.closedCustomersCount ?? 0,
      icon: Handshake,
      color: 'text-emerald-500',
      trend: {
        value: 0,
        direction: 'up',
        label: '未封存筆數',
      },
      progressLinks: [
        {
          label: '客戶管理（已成交）',
          href: '/landlord/customers',
          query: { status: 'closed' },
        },
      ],
    },
    {
      title: '出租率',
      value: `${occupancyRate}%`,
      icon: TrendingUp,
      color: 'text-green-500',
      trend: {
        value: 5.2,
        direction: 'up',
        label: '較上月',
      },
      progressLinks: [
        {
          label: '查看出租物件',
          href: '/landlord/properties',
          query: { status: 'rented' },
          badge: {
            count: stats?.rentedProperties || 0,
            variant: 'success',
          },
        },
        {
          label: '查看空置物件',
          href: '/landlord/properties',
          query: { status: 'vacant' },
          badge: {
            count: stats?.vacantProperties || 0,
            variant: 'warning',
          },
        },
      ],
    },
    {
      title: '本月收入',
      value: stats ? formatCurrency(stats.monthlyIncome) : 'NT$ 0',
      icon: DollarSign,
      color: 'text-yellow-500',
      trend: {
        value: 5,
        direction: 'up',
        label: '較上月',
      },
      progressLinks: [
        {
          label: '查看收入明細',
          href: '/landlord/finance/income',
        },
        {
          label: '查看待收款項',
          href: '/landlord/finance/receivables',
        },
      ],
    },
    {
      title: '年度收入',
      value: stats ? formatCurrency(stats.yearlyIncome) : 'NT$ 0',
      icon: FileText,
      color: 'text-purple-500',
      trend: {
        value: 12.3,
        direction: 'up',
        label: '較去年',
      },
      progressLinks: [
        {
          label: '年度報表',
          href: '/landlord/finance/annual-report',
        },
        {
          label: '匯出財務報告',
          href: '/landlord/finance/export',
        },
      ],
    },
  ]

  // Loading states for each KPI
  const kpiLoadingStates: KPILoadingState[] = kpis.map(() => ({
    isLoading,
    isEmpty: !stats,
  }))

  return (
    <DashboardLayout
      currentRole="landlord"
      pageTitle="房東儀表板"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '房東專區', href: '/landlord' },
        { label: '儀表板' },
      ]}
      greeting="歡迎回來，查看您的物件管理概況"
      headerActions={
        <Link href="/landlord/properties/add">
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
              href="/landlord/properties/add"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-[#7C3AED]/10 rounded-lg flex items-center justify-center group-hover:bg-[#7C3AED]/20">
                <Plus className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <div>
                <h4 className="text-white font-medium">新增物件</h4>
                <p className="text-sm text-[#999999]">手動輸入或 OCR 掃描</p>
              </div>
            </Link>

            <Link
              href="/landlord/appointments"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20">
                <Calendar className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">查看預約</h4>
                <p className="text-sm text-[#999999]">3 個待確認預約</p>
              </div>
            </Link>

            <Link
              href="/landlord/finance"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center group-hover:bg-yellow-500/20">
                <CreditCard className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">財務報表</h4>
                <p className="text-sm text-[#999999]">查看收支明細</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>最近活動</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  type: 'new_inquiry',
                  message: '張先生對「台北市大安區公寓」發送詢問',
                  time: '10 分鐘前',
                  color: 'text-blue-500',
                },
                {
                  type: 'payment_received',
                  message: '收到林小姐的租金付款 NT$ 25,000',
                  time: '2 小時前',
                  color: 'text-green-500',
                },
                {
                  type: 'appointment',
                  message: '明天下午 2:00 看房預約',
                  time: '5 小時前',
                  color: 'text-orange-500',
                },
                {
                  type: 'maintenance',
                  message: '「新竹市東區套房」維修完成',
                  time: '1 天前',
                  color: 'text-purple-500',
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
