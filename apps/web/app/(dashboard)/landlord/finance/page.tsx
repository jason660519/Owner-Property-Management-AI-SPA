
'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  FileText, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Calendar
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Link from 'next/link'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts'
// Local helper for currency formatting
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function FinancePage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/landlord/finance/summary')
        const data = await res.json()
        setSummary(data)
      } catch (error) {
        console.error('Failed to fetch finance summary:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [])

  if (loading) {
    return (
      <DashboardLayout
        currentRole="landlord"
        pageTitle="財務報表"
        breadcrumbs={[
            { label: '首頁', href: '/' },
            { label: '房東專區', href: '/landlord' },
            { label: '財務報表' },
        ]}
      >
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      currentRole="landlord"
      pageTitle="財務報表"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '房東專區', href: '/landlord' },
        { label: '財務報表' },
      ]}
      headerActions={
        <div className="flex gap-2">
          <Link href="/landlord/finance/transactions">
            <Button variant="outline">
              <CreditCard className="w-4 h-4 mr-2" />
              管理收支
            </Button>
          </Link>
          <Link href="/landlord/finance/reports">
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              產生報表
            </Button>
          </Link>
        </div>
      }
    >
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-[#1A1A1A] border-[#333333]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <span className="text-sm text-green-500 flex items-center">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                收入
              </span>
            </div>
            <p className="text-[#999999] text-sm mb-1">總收入</p>
            <h3 className="text-2xl font-bold text-white">
              {formatMoney(summary?.totalIncome || 0)}
            </h3>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-[#333333]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
              <span className="text-sm text-red-500 flex items-center">
                <ArrowDownRight className="w-4 h-4 mr-1" />
                支出
              </span>
            </div>
            <p className="text-[#999999] text-sm mb-1">總支出</p>
            <h3 className="text-2xl font-bold text-white">
              {formatMoney(summary?.totalExpense || 0)}
            </h3>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-[#333333]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-500" />
              </div>
              <span className="text-sm text-purple-500">
                淨利潤率 {summary?.totalIncome ? ((summary.netProfit / summary.totalIncome) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <p className="text-[#999999] text-sm mb-1">淨利潤</p>
            <h3 className="text-2xl font-bold text-white">
              {formatMoney(summary?.netProfit || 0)}
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 bg-[#1A1A1A] border-[#333333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <BarChart className="w-5 h-5 mr-2 text-[#7C3AED]" />
              收支趨勢
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary?.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="收入" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-[#333333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-[#7C3AED]" />
              支出分佈
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(summary?.categoryStats || {}).map(([category, amount]: [string, any]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-[#7C3AED] mr-2" />
                    <span className="text-[#cccccc] capitalize">{category}</span>
                  </div>
                  <span className="text-white font-medium">{formatMoney(amount)}</span>
                </div>
              ))}
              {Object.keys(summary?.categoryStats || {}).length === 0 && (
                <div className="text-center text-[#666666] py-8">
                  尚無支出資料
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
