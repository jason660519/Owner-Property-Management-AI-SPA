'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  CreditCard,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Filter,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  getBuyerPayments,
  PAYMENT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  type BuyerPaymentRecord,
  type BuyerPaymentSummary,
  type PaymentStatus,
} from '@/lib/actions/buyer-payments'

// ─── Status Config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PaymentStatus, { icon: React.ReactNode; style: string }> = {
  completed: {
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    style: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  pending: {
    icon: <Clock className="w-3.5 h-3.5" />,
    style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  processing: {
    icon: <Clock className="w-3.5 h-3.5" />,
    style: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  failed: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    style: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  cancelled: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    style: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
  refunded: {
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    style: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  },
  disputed: {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    style: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = 'TWD') {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function isOverdue(record: BuyerPaymentRecord) {
  return record.status === 'pending' && record.dueDate && new Date(record.dueDate) < new Date()
}

function generateReceiptHtml(record: BuyerPaymentRecord): string {
  const date = record.paidAt
    ? new Date(record.paidAt).toLocaleDateString('zh-TW')
    : new Date(record.createdAt).toLocaleDateString('zh-TW')
  return `<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="UTF-8">
<title>付款收據 ${record.transactionReference ?? record.id.slice(0, 8)}</title>
<style>body{font-family:sans-serif;max-width:600px;margin:40px auto;color:#333}
h1{font-size:24px;border-bottom:2px solid #333;padding-bottom:8px}
table{width:100%;border-collapse:collapse;margin-top:16px}
td{padding:8px 12px;border:1px solid #ddd}td:first-child{font-weight:600;width:40%}
.footer{margin-top:40px;font-size:12px;color:#999;text-align:center}</style>
</head><body>
<h1>付款收據</h1>
<table>
<tr><td>收據編號</td><td>${record.transactionReference ?? record.id.slice(0, 8).toUpperCase()}</td></tr>
<tr><td>付款類型</td><td>${PAYMENT_TYPE_LABELS[record.transactionType]}</td></tr>
<tr><td>金額</td><td>${formatCurrency(record.amount, record.currencyCode)}</td></tr>
<tr><td>付款方式</td><td>${record.paymentMethod}</td></tr>
<tr><td>狀態</td><td>${PAYMENT_STATUS_LABELS[record.status]}</td></tr>
<tr><td>日期</td><td>${date}</td></tr>
${record.propertyAddress ? `<tr><td>物件地址</td><td>${record.propertyAddress}</td></tr>` : ''}
${record.description ? `<tr><td>備註</td><td>${record.description}</td></tr>` : ''}
</table>
<p class="footer">此收據由系統自動產生，如有疑問請聯絡客服。</p>
</body></html>`
}

function downloadReceipt(record: BuyerPaymentRecord) {
  const html = generateReceiptHtml(record)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `receipt-${record.transactionReference ?? record.id.slice(0, 8)}.html`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BuyerPaymentsPage() {
  const [summary, setSummary] = useState<BuyerPaymentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    getBuyerPayments().then((data) => {
      setSummary(data)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    if (!summary) return []
    return summary.records.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      const date = new Date(r.createdAt)
      if (fromDate && date < new Date(fromDate)) return false
      if (toDate && date > new Date(toDate + 'T23:59:59')) return false
      if (minAmount && r.amount < Number(minAmount)) return false
      if (maxAmount && r.amount > Number(maxAmount)) return false
      return true
    })
  }, [summary, statusFilter, fromDate, toDate, minAmount, maxAmount])

  const yearlyTotal = useMemo(() => {
    const byYear: Record<number, number> = {}
    if (!summary) return byYear
    summary.records
      .filter((r) => r.status === 'completed')
      .forEach((r) => {
        const yr = new Date(r.createdAt).getFullYear()
        byYear[yr] = (byYear[yr] ?? 0) + r.amount
      })
    return byYear
  }, [summary])

  return (
    <DashboardLayout
      currentRole="contracted_buyer"
      pageTitle="繳費記錄"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '買家專區', href: '/buyer' },
        { label: '簽約儀表板', href: '/buyer/contracted/dashboard' },
        { label: '繳費記錄' },
      ]}
      greeting="查看所有付款記錄並下載收據。"
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-[#262626] border-[#333333] animate-pulse h-24"><CardContent>&nbsp;</CardContent></Card>
            ))}
          </div>
        ) : summary ? (
          <>
            {/* Overdue Alert */}
            {summary.overdueCount > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-400">
                    {summary.overdueCount} 筆款項已逾期未付
                  </p>
                  <p className="text-xs text-red-300 mt-0.5">請盡快完成付款以避免違約。</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card className="bg-[#262626] border-[#333333]">
                <CardContent className="p-4">
                  <p className="text-xs text-[#666666] mb-1">已完成付款</p>
                  <p className="text-lg font-bold text-green-400">{formatCurrency(summary.totalPaid)}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#262626] border-[#333333]">
                <CardContent className="p-4">
                  <p className="text-xs text-[#666666] mb-1">待繳金額</p>
                  <p className="text-lg font-bold text-yellow-400">{formatCurrency(summary.totalPending)}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#262626] border-[#333333]">
                <CardContent className="p-4">
                  <p className="text-xs text-[#666666] mb-1">今年已繳</p>
                  <p className="text-lg font-bold text-blue-400">{formatCurrency(summary.currentYearPaid)}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#262626] border-[#333333]">
                <CardContent className="p-4">
                  <p className="text-xs text-[#666666] mb-1">逾期筆數</p>
                  <p className={`text-lg font-bold ${summary.overdueCount > 0 ? 'text-red-400' : 'text-[#999999]'}`}>
                    {summary.overdueCount}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Annual Totals */}
            {Object.keys(yearlyTotal).length > 0 && (
              <Card className="bg-[#262626] border-[#333333]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm">年度付款統計</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(yearlyTotal)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([year, total]) => (
                        <div key={year} className="text-center">
                          <p className="text-xs text-[#666666]">{year} 年</p>
                          <p className="text-base font-semibold text-white">{formatCurrency(total)}</p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}

        {/* Filters */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">付款明細</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-sm text-[#999999] hover:text-white transition-colors"
          >
            <Filter className="w-4 h-4" />
            篩選
          </button>
        </div>

        {showFilters && (
          <Card className="bg-[#262626] border-[#333333]">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <Label className="text-[#cccccc] mb-1 block text-xs">狀態</Label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
                    className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value="all">全部</option>
                    {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((s) => (
                      <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-[#cccccc] mb-1 block text-xs">開始日期</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-[#1A1A1A] border-[#333333] text-white text-sm py-1.5"
                  />
                </div>
                <div>
                  <Label className="text-[#cccccc] mb-1 block text-xs">結束日期</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-[#1A1A1A] border-[#333333] text-white text-sm py-1.5"
                  />
                </div>
                <div>
                  <Label className="text-[#cccccc] mb-1 block text-xs">金額範圍（TWD）</Label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      placeholder="最低"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="bg-[#1A1A1A] border-[#333333] text-white text-sm py-1.5"
                    />
                    <Input
                      type="number"
                      placeholder="最高"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="bg-[#1A1A1A] border-[#333333] text-white text-sm py-1.5"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Records */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-[#262626] border-[#333333] animate-pulse h-20"><CardContent>&nbsp;</CardContent></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-[#262626] border-[#333333]">
            <CardContent className="flex flex-col items-center py-14 text-center">
              <CreditCard className="w-12 h-12 text-[#444444] mb-4" />
              <p className="text-white font-semibold mb-2">目前沒有符合條件的付款記錄</p>
              <p className="text-[#666666] text-sm">完成購屋或租屋程序後，付款記錄將顯示於此。</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((record) => {
              const cfg = STATUS_CONFIG[record.status]
              const overdue = isOverdue(record)
              return (
                <Card
                  key={record.id}
                  className={`bg-[#262626] border-[#333333] ${overdue ? 'border-red-500/40' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-[#1A1A1A] rounded-lg shrink-0">
                          <FileText className="w-4 h-4 text-[#7C3AED]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <span className="text-white text-sm font-medium">
                              {PAYMENT_TYPE_LABELS[record.transactionType]}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cfg.style}`}
                            >
                              {cfg.icon}
                              {PAYMENT_STATUS_LABELS[record.status]}
                            </span>
                            {overdue && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-red-500/10 text-red-400 border-red-500/20">
                                <AlertTriangle className="w-3 h-3" />
                                逾期
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#666666]">
                            {record.propertyAddress && <span>{record.propertyAddress}</span>}
                            <span>{new Date(record.createdAt).toLocaleDateString('zh-TW')}</span>
                            {record.dueDate && record.status === 'pending' && (
                              <span className={overdue ? 'text-red-400' : ''}>
                                到期：{new Date(record.dueDate).toLocaleDateString('zh-TW')}
                              </span>
                            )}
                            {record.transactionReference && (
                              <span className="font-mono">#{record.transactionReference}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-white font-bold">
                          {formatCurrency(record.amount, record.currencyCode)}
                        </span>
                        {record.status === 'completed' && (
                          <button
                            onClick={() => downloadReceipt(record)}
                            title="下載收據"
                            className="p-1.5 rounded-lg hover:bg-[#333333] text-[#666666] hover:text-white transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
