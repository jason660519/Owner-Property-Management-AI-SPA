
'use client'

import { useState } from 'react'
import { FileText, Download, Loader2, Table as TableIcon } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select' // Or native select if component issue
import { useToast } from '@/components/ui/Toast'

type ReportType = 'income_statement' | 'tax'

type IncomeStatementRow = {
  month: number
  rent_income: number
  maintenance: number
  utility: number
  other: number
  total_income: number
  total_expense: number
  net_income: number
}

type TaxReport = {
  year: string | number
  totalIncome: number
  deductibleExpenses: number
  taxableIncome: number
  expenseBreakdown?: Record<string, number>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('income_statement')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [reportData, setReportData] = useState<IncomeStatementRow[] | TaxReport | null>(null)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const generateReport = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/landlord/finance/reports?type=${reportType}&year=${year}`)
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as unknown
      if (reportType === 'income_statement') {
        const rows = Array.isArray(data)
          ? data
              .filter(isRecord)
              .map((row) => ({
                month: toNumber(row.month),
                rent_income: toNumber(row.rent_income),
                maintenance: toNumber(row.maintenance),
                utility: toNumber(row.utility),
                other: toNumber(row.other),
                total_income: toNumber(row.total_income),
                total_expense: toNumber(row.total_expense),
                net_income: toNumber(row.net_income),
              }))
          : []
        setReportData(rows)
      } else {
        if (isRecord(data)) {
          const breakdown: Record<string, number> | undefined = isRecord(data.expenseBreakdown)
            ? Object.fromEntries(
                Object.entries(data.expenseBreakdown).map(([k, v]) => [k, toNumber(v)])
              )
            : undefined
          setReportData({
            year: typeof data.year === 'string' || typeof data.year === 'number' ? data.year : year,
            totalIncome: toNumber(data.totalIncome),
            deductibleExpenses: toNumber(data.deductibleExpenses),
            taxableIncome: toNumber(data.taxableIncome),
            expenseBreakdown: breakdown,
          })
        } else {
          setReportData({
            year,
            totalIncome: 0,
            deductibleExpenses: 0,
            taxableIncome: 0,
            expenseBreakdown: {},
          })
        }
      }
    } catch (error) {
      showToast({ type: 'error', message: '產生報表失敗' })
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!reportData) return
    
    let csvContent = "data:text/csv;charset=utf-8,"
    
    if (reportType === 'income_statement' && Array.isArray(reportData)) {
      csvContent += "月份,租金收入,維修費,水電費,其他支出,總收入,總支出,淨收入\n"
      reportData.forEach((row) => {
        csvContent += `${row.month}月,${row.rent_income},${row.maintenance},${row.utility},${row.other},${row.total_income},${row.total_expense},${row.net_income}\n`
      })
    } else {
      // Tax Report
      if (reportData && !Array.isArray(reportData)) {
        csvContent += "年度,總收入,可扣抵費用,應稅所得\n"
        csvContent += `${reportData.year},${reportData.totalIncome},${reportData.deductibleExpenses},${reportData.taxableIncome}\n`
        csvContent += "\n費用明細\n類別,金額\n"
        Object.entries(reportData.expenseBreakdown || {}).forEach(([cat, amount]) => {
          csvContent += `${cat},${amount}\n`
        })
      }
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `report_${reportType}_${year}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DashboardLayout
      currentRole="landlord"
      pageTitle="報表產生器"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '房東專區', href: '/landlord' },
        { label: '財務報表', href: '/landlord/finance' },
        { label: '報表產生器' },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls */}
        <Card className="lg:col-span-1 bg-[#1A1A1A] border-[#333333] h-fit">
          <CardHeader>
            <CardTitle className="text-white">報表設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-[#999999]">報表類型</label>
              <select
                value={reportType}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'income_statement' || value === 'tax') {
                    setReportType(value)
                  }
                }}
                className="flex h-10 w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white ring-offset-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
              >
                <option value="income_statement">年度損益表 (Income Statement)</option>
                <option value="tax">稅務申報表 (Tax Report)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#999999]">年度</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="flex h-10 w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white ring-offset-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <Button className="w-full" onClick={generateReport} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              產生報表
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-3 bg-[#1A1A1A] border-[#333333] min-h-[500px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">報表預覽</CardTitle>
            {reportData && (
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" />
                匯出 CSV
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!reportData ? (
              <div className="flex flex-col items-center justify-center h-64 text-[#666666]">
                <TableIcon className="w-12 h-12 mb-4 opacity-20" />
                <p>請選擇報表類型並點擊「產生報表」</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {reportType === 'income_statement' ? (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[#999999] uppercase bg-[#262626] border-b border-[#333333]">
                      <tr>
                        <th className="px-4 py-3">月份</th>
                        <th className="px-4 py-3 text-right text-green-500">租金收入</th>
                        <th className="px-4 py-3 text-right text-red-500">維修費</th>
                        <th className="px-4 py-3 text-right text-red-500">水電費</th>
                        <th className="px-4 py-3 text-right text-red-500">其他</th>
                        <th className="px-4 py-3 text-right font-bold text-white">淨收入</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333333]">
                      {Array.isArray(reportData) && reportData.map((row) => (
                        <tr key={row.month} className="hover:bg-[#262626]/50">
                          <td className="px-4 py-3 text-white">{row.month}月</td>
                          <td className="px-4 py-3 text-right">{row.rent_income.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{row.maintenance.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{row.utility.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{row.other.toLocaleString()}</td>
                          <td className={`px-4 py-3 text-right font-bold ${row.net_income >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {row.net_income.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-[#262626] rounded-lg">
                        <p className="text-[#999999] text-sm">年度總收入</p>
                        <p className="text-2xl font-bold text-white">{!Array.isArray(reportData) ? reportData?.totalIncome?.toLocaleString() : ''}</p>
                      </div>
                      <div className="p-4 bg-[#262626] rounded-lg">
                        <p className="text-[#999999] text-sm">可扣抵費用</p>
                        <p className="text-2xl font-bold text-white">{!Array.isArray(reportData) ? reportData?.deductibleExpenses?.toLocaleString() : ''}</p>
                      </div>
                      <div className="p-4 bg-[#262626] rounded-lg border border-purple-500/30">
                        <p className="text-purple-400 text-sm">預估應稅所得</p>
                        <p className="text-2xl font-bold text-white">{!Array.isArray(reportData) ? reportData?.taxableIncome?.toLocaleString() : ''}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-white font-medium mb-3">費用明細</h3>
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-[#999999] uppercase bg-[#262626] border-b border-[#333333]">
                          <tr>
                            <th className="px-4 py-3">費用類別</th>
                            <th className="px-4 py-3 text-right">金額</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333333]">
                          {!Array.isArray(reportData) &&
                            Object.entries(reportData?.expenseBreakdown || {}).map(([cat, amount]) => (
                            <tr key={cat}>
                              <td className="px-4 py-3 text-white capitalize">{cat}</td>
                              <td className="px-4 py-3 text-right">{toNumber(amount).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
