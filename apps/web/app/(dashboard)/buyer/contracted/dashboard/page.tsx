/**
 * @file page.tsx
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Contracted Buyer Dashboard - For buyers with signed purchase contracts
 */

'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, DollarSign, CreditCard, FileCheck, Plus, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Link from 'next/link'
import {
  DashboardLayout,
  StatsGrid,
  type KPIConfig,
  type KPILoadingState,
} from '@/components/dashboard'

interface BuyerStats {
  contractDate: string // ISO date string
  closingDate: string // ISO date string
  propertyAddress: string
  totalPrice: number
  downPayment: number
  remainingBalance: number
  paidAmount: number
  nextPaymentDate: string // ISO date string
  nextPaymentAmount: number
  loanApproved: boolean
  loanAmount: number
  loanStatus: 'pending' | 'approved' | 'rejected' | 'not_applied'
  interestRate: number
  documentsRequired: number
  documentsSubmitted: number
  documentsApproved: number
}

export default function ContractedBuyerDashboardPage() {
  const [stats, setStats] = useState<BuyerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // TODO: 從 Supabase 查詢實際數據
    // 目前使用模擬數據
    const fetchStats = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setStats({
        contractDate: '2026-01-15',
        closingDate: '2026-06-15',
        propertyAddress: '台北市大安區敦化南路二段 123 號 5 樓',
        totalPrice: 15000000,
        downPayment: 3000000,
        remainingBalance: 12000000,
        paidAmount: 3000000,
        nextPaymentDate: '2026-04-01',
        nextPaymentAmount: 6000000,
        loanApproved: true,
        loanAmount: 10500000,
        loanStatus: 'approved',
        interestRate: 2.06,
        documentsRequired: 10,
        documentsSubmitted: 7,
        documentsApproved: 5,
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

  const closingDays = stats ? getDaysUntil(stats.closingDate) : 0
  const nextPaymentDays = stats ? getDaysUntil(stats.nextPaymentDate) : 0
  const purchaseProgress = stats
    ? Math.round((stats.paidAmount / stats.totalPrice) * 100)
    : 0

  // KPI configurations
  const kpis: KPIConfig[] = [
    {
      title: '購買進度',
      value: `${purchaseProgress}%`,
      icon: ShoppingCart,
      color: 'text-blue-500',
      trend: {
        value: purchaseProgress,
        direction: 'up',
        label: '已完成',
      },
      progressLinks: [
        {
          label: '查看合約詳情',
          href: '/buyer/contracts/current',
        },
        {
          label: '查看物件資訊',
          href: '/buyer/properties/current',
        },
      ],
    },
    {
      title: '付款狀態',
      value: stats ? formatCurrency(stats.remainingBalance) : 'NT$ 0',
      icon: DollarSign,
      color: 'text-green-500',
      progressLinks: [
        {
          label: '查看付款記錄',
          href: '/buyer/payments',
          badge: {
            count: 1,
            variant: 'success',
          },
        },
        {
          label: '付款提醒設定',
          href: '/buyer/payments/reminders',
        },
      ],
    },
    {
      title: '貸款進度',
      value: stats?.loanStatus === 'approved' ? '已核貸' : '處理中',
      icon: CreditCard,
      color: 'text-purple-500',
      progressLinks: [
        {
          label: '查看貸款詳情',
          href: '/buyer/loans/current',
        },
        {
          label: '貸款文件',
          href: '/buyer/loans/documents',
        },
      ],
    },
    {
      title: '文件檢查清單',
      value: stats
        ? `${stats.documentsApproved}/${stats.documentsRequired}`
        : '0/0',
      icon: FileCheck,
      color: 'text-orange-500',
      progressLinks: [
        {
          label: '管理文件',
          href: '/buyer/documents',
          badge: stats && stats.documentsRequired - stats.documentsSubmitted > 0 ? {
            count: stats.documentsRequired - stats.documentsSubmitted,
            variant: 'warning',
          } : undefined,
        },
        {
          label: '上傳文件',
          href: '/buyer/documents/upload',
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
      currentRole="contracted_buyer"
      pageTitle="簽約買家儀表板"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '買家專區', href: '/buyer' },
        { label: '簽約儀表板' },
      ]}
      greeting={stats ? `過戶預計日期：${formatDate(stats.closingDate)}` : '載入中...'}
      headerActions={
        <Link href="/buyer/documents/upload">
          <Button>
            <Plus className="w-5 h-5 mr-2" />
            上傳文件
          </Button>
        </Link>
      }
    >
      {/* KPI Stats Grid */}
      <StatsGrid kpis={kpis} loading={kpiLoadingStates} columns={4} className="mb-8" />

      {/* Purchase Info & Payment Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase Information */}
        <Card>
          <CardHeader>
            <CardTitle>購買資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats ? (
              <>
                <div className="flex items-start justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <div className="flex-1">
                    <span className="text-sm text-[#999999]">物件地址</span>
                    <p className="text-sm font-medium text-white mt-1">
                      {stats.propertyAddress}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">總價</span>
                  <span className="text-lg font-bold text-white">
                    {formatCurrency(stats.totalPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">已付款</span>
                  <span className="text-sm font-medium text-green-500">
                    {formatCurrency(stats.paidAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">待付款</span>
                  <span className="text-sm font-medium text-yellow-500">
                    {formatCurrency(stats.remainingBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">下次付款日</span>
                  <span className="text-sm font-medium text-orange-500">
                    {formatDate(stats.nextPaymentDate)} ({nextPaymentDays} 天)
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-[#666666]">載入中...</div>
            )}
          </CardContent>
        </Card>

        {/* Loan Information */}
        <Card>
          <CardHeader>
            <CardTitle>貸款資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats ? (
              <>
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">貸款狀態</span>
                  <span className="text-sm font-medium text-green-500">
                    {stats.loanStatus === 'approved' && '已核貸'}
                    {stats.loanStatus === 'pending' && '審核中'}
                    {stats.loanStatus === 'rejected' && '已拒絕'}
                    {stats.loanStatus === 'not_applied' && '未申請'}
                  </span>
                </div>
                {stats.loanApproved && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                      <span className="text-sm text-[#999999]">核貸金額</span>
                      <span className="text-lg font-bold text-white">
                        {formatCurrency(stats.loanAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                      <span className="text-sm text-[#999999]">利率</span>
                      <span className="text-sm font-medium text-white">
                        {stats.interestRate}%
                      </span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                  <span className="text-sm text-[#999999]">文件進度</span>
                  <span className="text-sm font-medium text-white">
                    {stats.documentsApproved}/{stats.documentsRequired} 已核准
                  </span>
                </div>
                <Link href="/buyer/loans/current">
                  <Button variant="outline" className="w-full mt-2">
                    <CreditCard className="w-4 h-4 mr-2" />
                    查看貸款詳情
                  </Button>
                </Link>
              </>
            ) : (
              <div className="text-center py-8 text-[#666666]">載入中...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
