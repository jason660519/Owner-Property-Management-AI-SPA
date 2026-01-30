'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface DashboardStats {
  totalProperties: number
  rentedProperties: number
  vacantProperties: number
  monthlyIncome: number
  yearlyIncome: number
  pendingTasks: number
}

export default function LandlordDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    rentedProperties: 0,
    vacantProperties: 0,
    monthlyIncome: 0,
    yearlyIncome: 0,
    pendingTasks: 0,
  })

  useEffect(() => {
    // TODO: 從 Supabase 查詢實際數據
    // 目前使用模擬數據
    setStats({
      totalProperties: 12,
      rentedProperties: 10,
      vacantProperties: 2,
      monthlyIncome: 285000,
      yearlyIncome: 3420000,
      pendingTasks: 5,
    })
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const occupancyRate = stats.totalProperties > 0
    ? Math.round((stats.rentedProperties / stats.totalProperties) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">儀表板</h1>
          <p className="text-[#999999] mt-1">歡迎回來，查看您的物件管理概況</p>
        </div>
        <Link href="/landlord/properties/add">
          <Button>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增物件
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#999999]">物件總數</p>
                <h3 className="text-3xl font-bold text-white mt-2">{stats.totalProperties}</h3>
                <p className="text-xs text-green-500 mt-1">↑ 2 本月新增</p>
              </div>
              <div className="w-12 h-12 bg-[#7C3AED]/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#999999]">出租率</p>
                <h3 className="text-3xl font-bold text-white mt-2">{occupancyRate}%</h3>
                <p className="text-xs text-[#999999] mt-1">{stats.rentedProperties}/{stats.totalProperties} 已出租</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#999999]">本月收入</p>
                <h3 className="text-2xl font-bold text-white mt-2">{formatCurrency(stats.monthlyIncome)}</h3>
                <p className="text-xs text-green-500 mt-1">↑ 5% vs 上月</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#999999]">待處理事項</p>
                <h3 className="text-3xl font-bold text-white mt-2">{stats.pendingTasks}</h3>
                <p className="text-xs text-orange-500 mt-1">需要您的注意</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <svg className="w-5 h-5 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
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
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
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
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
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
                  <div className={`w-2 h-2 rounded-full mt-2 ${activity.color.replace('text-', 'bg-')}`} />
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
    </div>
  )
}
