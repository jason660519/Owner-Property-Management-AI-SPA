'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, Filter, Info, Loader2, Mail, SlidersHorizontal, Tags } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
import type { CustomerStatus } from './customer-details'
import { parseCustomerDetails } from './customer-details'
import { CustomerStatusBadge } from './CustomerDetailsPanel'
import type { Customer } from './customer-types'
import {
  computeTenantFit,
  DEFAULT_TENANT_FILTER_CRITERIA,
  filterTenants,
  OCCUPATION_OPTIONS,
  sortTenants,
  type TenantFilterCriteria,
  type TenantSortKey,
} from './tenant-filter-logic'

const TEMPLATE_STORAGE_KEY = 'landlord_vis97_tenant_filter_templates_v1'
const BATCH_MESSAGE_STORAGE_KEY = 'landlord_vis97_batch_message_customer_ids'

export type SavedTenantFilterTemplate = {
  id: string
  name: string
  description?: string
  criteria: TenantFilterCriteria
  sortKey: TenantSortKey
  referenceMonthlyRent: number
}

type ToastFn = (args: { type: 'success' | 'error' | 'info'; message: string; description?: string }) => void

function loadTemplates(): SavedTenantFilterTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedTenantFilterTemplate[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveTemplates(next: SavedTenantFilterTemplate[]) {
  window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next))
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatCsvFilename() {
  const d = new Date()
  return `tenant-filter-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}.csv`
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function TenantFilterWorkbench({
  customers,
  isLoading,
  onReload,
  onBatchUpdateStatus,
  showToast,
}: {
  customers: Customer[]
  isLoading: boolean
  onReload: () => Promise<void>
  onBatchUpdateStatus: (ids: string[], status: CustomerStatus) => Promise<void>
  showToast: ToastFn
}) {
  const router = useRouter()
  const liveRegionId = useId()
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const [referenceRentInput, setReferenceRentInput] = useState('30000')
  const [appliedReferenceRent, setAppliedReferenceRent] = useState(30000)

  const [sortKey, setSortKey] = useState<TenantSortKey>('fit_desc')

  const [draftCriteria, setDraftCriteria] = useState<TenantFilterCriteria>({ ...DEFAULT_TENANT_FILTER_CRITERIA })
  const [appliedCriteria, setAppliedCriteria] = useState<TenantFilterCriteria>({ ...DEFAULT_TENANT_FILTER_CRITERIA })

  const [templates, setTemplates] = useState<SavedTenantFilterTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')

  const [renameTarget, setRenameTarget] = useState<SavedTenantFilterTemplate | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<SavedTenantFilterTemplate | null>(null)

  const [batchStatusOpen, setBatchStatusOpen] = useState(false)
  const [batchStatus, setBatchStatus] = useState<CustomerStatus>('potential')
  const [batchBusy, setBatchBusy] = useState(false)

  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all')

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [expandedFitId, setExpandedFitId] = useState<string | null>(null)

  const [resultCountMessage, setResultCountMessage] = useState('')

  useEffect(() => {
    setTemplates(loadTemplates())
  }, [])

  const getDetails = useCallback((c: Customer) => parseCustomerDetails(c.notes), [])

  const filteredSorted = useMemo(() => {
    const filtered = filterTenants(customers, getDetails, appliedCriteria, appliedReferenceRent)
    return sortTenants(filtered, getDetails, sortKey, appliedReferenceRent)
  }, [appliedCriteria, appliedReferenceRent, customers, getDetails, sortKey])

  useEffect(() => {
    setResultCountMessage(`顯示 ${filteredSorted.length} 筆結果`)
  }, [filteredSorted.length])

  const selectedIds = useMemo(() => Object.keys(rowSelection).filter((id) => rowSelection[id]), [rowSelection])

  const toggleRow = (id: string) => {
    setRowSelection((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const allVisibleSelected =
    filteredSorted.length > 0 && filteredSorted.every((c) => rowSelection[c.id])

  const toggleSelectPage = () => {
    if (allVisibleSelected) {
      setRowSelection((prev) => {
        const next = { ...prev }
        for (const c of filteredSorted) delete next[c.id]
        return next
      })
      return
    }
    setRowSelection((prev) => {
      const next = { ...prev }
      for (const c of filteredSorted) next[c.id] = true
      return next
    })
  }

  const applyFilters = () => {
    const rent = Number(referenceRentInput)
    if (!Number.isFinite(rent) || rent <= 0) {
      showToast({ type: 'error', message: '參考月租無效', description: '請輸入大於 0 的參考月租（NT$）。' })
      return
    }
    setAppliedReferenceRent(rent)
    setAppliedCriteria({ ...draftCriteria })
    setRowSelection({})
  }

  const clearFilters = () => {
    setDraftCriteria({ ...DEFAULT_TENANT_FILTER_CRITERIA })
    setAppliedCriteria({ ...DEFAULT_TENANT_FILTER_CRITERIA })
    setRowSelection({})
  }

  const applyBuiltinTemplate = () => {
    setDraftCriteria((prev) => ({
      ...prev,
      rentIncomeMultiple: 3,
    }))
    showToast({
      type: 'info',
      message: '已套用內建範本條件',
      description: '已勾選「月收入 ≥ 3 倍參考月租」；請確認參考月租後按套用。',
    })
  }

  const persistTemplateList = (next: SavedTenantFilterTemplate[]) => {
    setTemplates(next)
    saveTemplates(next)
  }

  const handleSaveTemplate = () => {
    const name = saveName.trim()
    if (!name) {
      showToast({ type: 'error', message: '請輸入範本名稱' })
      return
    }
    const entry: SavedTenantFilterTemplate = {
      id: `tpl-${Date.now()}`,
      name,
      description: saveDescription.trim() || undefined,
      criteria: { ...draftCriteria },
      sortKey,
      referenceMonthlyRent: Number(referenceRentInput) || appliedReferenceRent,
    }
    persistTemplateList([...templates, entry])
    setSaveOpen(false)
    setSaveName('')
    setSaveDescription('')
    setSelectedTemplateId(entry.id)
    showToast({ type: 'success', message: '範本已儲存', description: '僅儲存在此瀏覽器（本裝置）。' })
  }

  const applyTemplate = (tpl: SavedTenantFilterTemplate) => {
    setDraftCriteria({ ...tpl.criteria })
    setSortKey(tpl.sortKey)
    setReferenceRentInput(String(tpl.referenceMonthlyRent))
    setSelectedTemplateId(tpl.id)
  }

  const commitTemplateSelection = () => {
    const tpl = templates.find((t) => t.id === selectedTemplateId)
    if (!tpl) return
    applyTemplate(tpl)
    showToast({ type: 'success', message: '已載入範本條件', description: tpl.name })
  }

  const handleRename = () => {
    if (!renameTarget) return
    const name = renameValue.trim()
    if (!name) return
    persistTemplateList(templates.map((t) => (t.id === renameTarget.id ? { ...t, name } : t)))
    setRenameTarget(null)
    showToast({ type: 'success', message: '範本已重新命名' })
  }

  const handleDeleteTemplate = () => {
    if (!deleteTarget) return
    persistTemplateList(templates.filter((t) => t.id !== deleteTarget.id))
    if (selectedTemplateId === deleteTarget.id) setSelectedTemplateId('')
    setDeleteTarget(null)
    showToast({ type: 'success', message: '範本已刪除' })
  }

  const runBatchStatus = async () => {
    if (selectedIds.length === 0) {
      showToast({ type: 'error', message: '請先勾選租客' })
      return
    }
    setBatchBusy(true)
    try {
      await onBatchUpdateStatus(selectedIds, batchStatus)
      setBatchStatusOpen(false)
      setRowSelection({})
      await onReload()
      showToast({ type: 'success', message: '批次狀態已更新' })
    } catch (e) {
      console.error(e)
      showToast({ type: 'error', message: '批次更新失敗', description: '請稍後再試' })
    } finally {
      setBatchBusy(false)
    }
  }

  const runBatchMessage = () => {
    if (selectedIds.length === 0) {
      showToast({ type: 'error', message: '請先勾選租客' })
      return
    }
    try {
      window.sessionStorage.setItem(BATCH_MESSAGE_STORAGE_KEY, JSON.stringify(selectedIds))
    } catch {
      // ignore quota / private mode
    }
    router.push('/landlord/messages')
    showToast({
      type: 'info',
      message: '已前往訊息中心',
      description: '名單已暫存於瀏覽器；後續若訊息中心支援可讀取自動帶入。',
    })
  }

  const exportCsv = () => {
    const rows =
      exportScope === 'selected'
        ? filteredSorted.filter((c) => rowSelection[c.id])
        : filteredSorted
    if (rows.length === 0) {
      showToast({ type: 'error', message: '沒有可匯出的資料' })
      return
    }
    const header = ['姓名', '信用分數', '月收入', '職業類型', '適合度', '適合度標籤', '客戶狀態', '電話', 'Email']
    const lines = [header.join(',')]
    for (const c of rows) {
      const p = getDetails(c).tenantProfile
      const fit = computeTenantFit(p, appliedReferenceRent)
      lines.push(
        [
          escapeCsv(c.name),
          p?.creditScore != null ? String(p.creditScore) : '',
          p?.monthlyIncome != null ? String(p.monthlyIncome) : '',
          escapeCsv(p?.occupationType ?? ''),
          fit.score != null ? String(fit.score) : '',
          escapeCsv(fit.tier ?? ''),
          escapeCsv(c.status),
          escapeCsv(c.phone),
          escapeCsv(c.email),
        ].join(','),
      )
    }
    const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = formatCsvFilename()
    a.click()
    URL.revokeObjectURL(url)
    showToast({ type: 'success', message: '已匯出 CSV' })
  }

  const filterPanel = (
    <div className="space-y-4 text-sm text-text-primary">
      <div className="space-y-2">
        <Label htmlFor="ref-rent">參考月租（NT$）</Label>
        <Input
          id="ref-rent"
          inputMode="numeric"
          value={referenceRentInput}
          onChange={(e) => setReferenceRentInput(e.target.value)}
          className="bg-bg-secondary border-border-default"
          aria-describedby={`${liveRegionId}-rent-hint`}
        />
        <p id={`${liveRegionId}-rent-hint`} className="text-xs text-text-secondary">
          用於收入倍數篩選（T-21）與適合度試算；請與待出租物件月租一致。
        </p>
      </div>

      <div className="space-y-2">
        <Label>排序</Label>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as TenantSortKey)}
          className="flex h-10 w-full rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm"
        >
          <option value="fit_desc">適合度（高→低）</option>
          <option value="fit_asc">適合度（低→高）</option>
          <option value="credit_desc">信用分數（高→低）</option>
          <option value="credit_asc">信用分數（低→高）</option>
          <option value="income_desc">月收入（高→低）</option>
          <option value="income_asc">月收入（低→高）</option>
          <option value="occupation_asc">職業類型（筆劃／字母序）</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>信用最低</Label>
          <Input
            inputMode="numeric"
            value={draftCriteria.creditMin ?? ''}
            onChange={(e) => {
              const v = e.target.value
              setDraftCriteria((p) => ({
                ...p,
                creditMin: v === '' ? null : Number(v),
              }))
            }}
            className="bg-bg-secondary border-border-default"
          />
        </div>
        <div className="space-y-1">
          <Label>信用最高</Label>
          <Input
            inputMode="numeric"
            value={draftCriteria.creditMax ?? ''}
            onChange={(e) => {
              const v = e.target.value
              setDraftCriteria((p) => ({
                ...p,
                creditMax: v === '' ? null : Number(v),
              }))
            }}
            className="bg-bg-secondary border-border-default"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>月收入最低（NT$）</Label>
        <Input
          inputMode="numeric"
          value={draftCriteria.incomeMin ?? ''}
          onChange={(e) => {
            const v = e.target.value
            setDraftCriteria((p) => ({
              ...p,
              incomeMin: v === '' ? null : Number(v),
            }))
          }}
          className="bg-bg-secondary border-border-default"
        />
      </div>

      <div className="space-y-2">
        <Label>快速倍數（對參考月租）</Label>
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3] as const).map((m) => {
            const active = draftCriteria.rentIncomeMultiple === m
            return (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={active ? 'primary' : 'outline'}
                className={active ? 'bg-[#7C3AED]' : ''}
                onClick={() =>
                  setDraftCriteria((p) => ({
                    ...p,
                    rentIncomeMultiple: active ? null : m,
                  }))
                }
              >
                收入 ≥ {m}× 租
              </Button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>職業類型（多選）</Label>
        <div className="flex flex-wrap gap-2">
          {OCCUPATION_OPTIONS.map((occ) => {
            const on = draftCriteria.occupationFilters.includes(occ)
            return (
              <button
                key={occ}
                type="button"
                onClick={() =>
                  setDraftCriteria((p) => ({
                    ...p,
                    occupationFilters: on
                      ? p.occupationFilters.filter((x) => x !== occ)
                      : [...p.occupationFilters, occ],
                  }))
                }
                className={[
                  'rounded-full border px-3 py-1 text-xs transition-colors min-h-[44px] min-w-[44px]',
                  on ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#333333] text-[#cccccc]',
                ].join(' ')}
              >
                {occ}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={applyFilters} className="bg-[#7C3AED]">
          套用
        </Button>
        <Button type="button" variant="outline" onClick={clearFilters}>
          清除
        </Button>
      </div>

      <div className="border-t border-[#333333] pt-4 space-y-3">
        <div className="flex items-center gap-2 text-text-secondary">
          <Tags className="w-4 h-4" />
          <span className="font-medium text-text-primary">篩選條件範本（本裝置）</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={applyBuiltinTemplate}>
          載入內建：月收入 ≥ 3 倍租金
        </Button>
        <div className="flex flex-col gap-2">
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm"
          >
            <option value="">選擇已存範本…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={commitTemplateSelection} disabled={!selectedTemplateId}>
              載入至編輯區
            </Button>
            <Button type="button" size="sm" onClick={() => setSaveOpen(true)} className="bg-[#7C3AED]">
              儲存為範本
            </Button>
          </div>
          {templates.length > 0 && (
            <ul className="space-y-1 text-xs text-text-secondary">
              {templates.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{t.name}</span>
                  <span className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      className="text-[#7C3AED] hover:underline"
                      onClick={() => {
                        setRenameTarget(t)
                        setRenameValue(t.name)
                      }}
                    >
                      重新命名
                    </button>
                    <button type="button" className="text-red-400 hover:underline" onClick={() => setDeleteTarget(t)}>
                      刪除
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="lg:hidden border-[#333333]"
            onClick={() => setFilterSheetOpen(true)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            篩選條件
          </Button>
          <span className="text-sm text-text-secondary" aria-live="polite" id={liveRegionId}>
            {resultCountMessage}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span>匯出範圍</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="export-scope"
                checked={exportScope === 'all'}
                onChange={() => setExportScope('all')}
              />
              目前結果
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="export-scope"
                checked={exportScope === 'selected'}
                onChange={() => setExportScope('selected')}
              />
              僅已勾選
            </label>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={exportCsv}
            disabled={isLoading || filteredSorted.length === 0}
            className="border-[#333333]"
          >
            <Download className="w-4 h-4 mr-2" />
            匯出 CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,280px)_1fr] gap-4">
        <Card className="hidden xl:block bg-[#1A1A1A] border-[#333333] p-4 space-y-2">
          <div className="flex items-center gap-2 text-white font-semibold mb-2">
            <Filter className="w-4 h-4 text-[#7C3AED]" />
            篩選條件
          </div>
          {filterPanel}
        </Card>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-sm text-text-secondary">
            <span>已選 {selectedIds.length} 筆（當頁列表）</span>
            <Button type="button" size="sm" variant="outline" className="h-9" onClick={runBatchMessage}>
              <Mail className="w-4 h-4 mr-1" />
              批次傳訊
            </Button>
            <Button type="button" size="sm" className="h-9 bg-[#7C3AED]" onClick={() => setBatchStatusOpen(true)}>
              批次更新狀態
            </Button>
          </div>

          <Card className="bg-[#1A1A1A] border-[#333333] overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-text-secondary">
                <Loader2 className="w-5 h-5 animate-spin" />
                載入中...
              </div>
            ) : (
              <table className="w-full text-sm text-left min-w-[720px]">
                <thead className="text-xs text-text-secondary uppercase bg-bg-secondary border-b border-[#333333]">
                  <tr>
                    <th className="px-3 py-3 w-10">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectPage} aria-label="全選當頁" />
                    </th>
                    <th className="px-3 py-3">姓名</th>
                    <th className="px-3 py-3">信用</th>
                    <th className="px-3 py-3">月收入</th>
                    <th className="px-3 py-3">職業</th>
                    <th className="px-3 py-3">適合度</th>
                    <th className="px-3 py-3">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {filteredSorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-text-secondary">
                        沒有符合條件的租客，請調整篩選或補齊客戶資料中的租客欄位。
                      </td>
                    </tr>
                  ) : (
                    filteredSorted.map((c) => {
                      const profile = getDetails(c).tenantProfile
                      const fit = computeTenantFit(profile, appliedReferenceRent)
                      const tierClass =
                        fit.tier === '佳'
                          ? 'text-emerald-400'
                          : fit.tier === '中'
                            ? 'text-amber-300'
                            : fit.tier === '待觀察'
                              ? 'text-rose-300'
                              : 'text-text-secondary'

                      return (
                        <tr key={c.id} className="hover:bg-[#262626]/60">
                          <td className="px-3 py-3 align-top">
                            <input
                              type="checkbox"
                              checked={!!rowSelection[c.id]}
                              onChange={() => toggleRow(c.id)}
                              aria-label={`選取 ${c.name}`}
                            />
                          </td>
                          <td className="px-3 py-3 font-medium text-white whitespace-nowrap">
                            <Link className="text-[#7C3AED] hover:underline" href={`/landlord/customers?customerId=${c.id}`}>
                              {c.name}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-text-secondary">{profile?.creditScore ?? '—'}</td>
                          <td className="px-3 py-3 text-text-secondary">
                            {profile?.monthlyIncome != null ? profile.monthlyIncome.toLocaleString('zh-TW') : '—'}
                          </td>
                          <td className="px-3 py-3 text-text-secondary max-w-[140px] truncate">
                            {profile?.occupationType ?? '—'}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className={tierClass}>
                                {fit.score != null ? fit.score : '未評分'}
                                {fit.tier ? ` · ${fit.tier}` : ''}
                              </span>
                              <button
                                type="button"
                                className="p-1 rounded-md hover:bg-bg-secondary text-text-secondary"
                                aria-label={`${c.name} 適合度說明`}
                                aria-expanded={expandedFitId === c.id}
                                onClick={() => setExpandedFitId((prev) => (prev === c.id ? null : c.id))}
                              >
                                <Info className="w-4 h-4" />
                              </button>
                            </div>
                            {expandedFitId === c.id && (
                              <ul className="mt-2 text-xs text-text-secondary list-disc pl-4 space-y-1">
                                {fit.lines.map((line, idx) => (
                                  <li key={`${c.id}-line-${idx}`}>{line}</li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <CustomerStatusBadge status={c.status} />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>篩選條件</SheetTitle>
            <SheetDescription>行動版：完成後請套用並關閉面板。</SheetDescription>
          </SheetHeader>
          <div className="p-4">{filterPanel}</div>
        </SheetContent>
      </Sheet>

      {saveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">儲存篩選範本</h3>
            <div className="space-y-2">
              <Label>範本名稱</Label>
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} className="bg-bg-secondary border-border-default" />
            </div>
            <div className="space-y-2">
              <Label>說明（選填）</Label>
              <Input value={saveDescription} onChange={(e) => setSaveDescription(e.target.value)} className="bg-bg-secondary border-border-default" />
            </div>
            <p className="text-xs text-text-secondary">範本僅儲存在此瀏覽器裝置（localStorage）。</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
                取消
              </Button>
              <Button type="button" className="bg-[#7C3AED]" onClick={handleSaveTemplate}>
                儲存
              </Button>
            </div>
          </div>
        </div>
      )}

      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">重新命名範本</h3>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="bg-bg-secondary border-border-default" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRenameTarget(null)}>
                取消
              </Button>
              <Button type="button" className="bg-[#7C3AED]" onClick={handleRename}>
                儲存
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl w-full max-w-md p-6 space-y-4">
            <p className="text-white">確定刪除範本「{deleteTarget.name}」？</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
                取消
              </Button>
              <Button type="button" className="bg-red-600" onClick={handleDeleteTemplate}>
                刪除
              </Button>
            </div>
          </div>
        </div>
      )}

      {batchStatusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">批次更新狀態</h3>
            <p className="text-sm text-text-secondary">將套用至已選 {selectedIds.length} 筆租客</p>
            <select
              value={batchStatus}
              onChange={(e) => setBatchStatus(e.target.value as CustomerStatus)}
              className="flex h-10 w-full rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm"
            >
              <option value="potential">潛在</option>
              <option value="negotiating">洽談中</option>
              <option value="closed">已成交</option>
              <option value="lost">已失效</option>
            </select>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBatchStatusOpen(false)} disabled={batchBusy}>
                取消
              </Button>
              <Button type="button" className="bg-[#7C3AED]" onClick={() => void runBatchStatus()} disabled={batchBusy}>
                {batchBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : '確認'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
