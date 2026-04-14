'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Wrench,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import {
  getMyMaintenanceRequests,
  createMaintenanceRequest,
  cancelMaintenanceRequest,
  confirmMaintenanceClosureByTenant,
  type MaintenanceRequest,
  type MaintenanceCategory,
  type MaintenancePriority,
} from '@/lib/actions/maintenance'
import { createClient } from '@/lib/supabase/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: '水管/排水',
  electrical: '電氣/照明',
  hvac: '冷暖氣/通風',
  appliance: '家電設備',
  structural: '門窗/結構',
  other: '其他',
}

const PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  low: '一般',
  medium: '中等',
  high: '緊急',
  urgent: '非常緊急',
}

const PRIORITY_STYLES: Record<MaintenancePriority, string> = {
  low: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; style: string }
> = {
  open: {
    label: '待處理',
    icon: <Clock className="w-4 h-4" />,
    style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  in_progress: {
    label: '處理中',
    icon: <Wrench className="w-4 h-4" />,
    style: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  completed: {
    label: '已完成',
    icon: <CheckCircle className="w-4 h-4" />,
    style: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  cancelled: {
    label: '已取消',
    icon: <XCircle className="w-4 h-4" />,
    style: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
  pending_tenant: {
    label: '待您確認結案',
    icon: <CheckCircle className="w-4 h-4" />,
    style: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  },
}

// ─── Form Schema ──────────────────────────────────────────────────────────────

const formSchema = z.object({
  category: z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  title: z.string().min(5, '問題標題至少需要 5 個字'),
  description: z.string().min(10, '問題描述至少需要 10 個字'),
})

type FormData = z.infer<typeof formSchema>

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.open
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.style}`}
    >
      {config.icon}
      {config.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_STYLES[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  request,
  onCancel,
  onConfirmClosure,
}: {
  request: MaintenanceRequest
  onCancel: (id: string) => void
  onConfirmClosure: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="bg-[#262626] border-[#333333]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
              <span className="text-xs text-[#666666]">
                {CATEGORY_LABELS[request.category]}
              </span>
            </div>
            <h3 className="text-white font-semibold truncate">{request.title}</h3>
            <p className="text-[#999999] text-sm mt-0.5 truncate">{request.propertyAddress}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {request.status === 'pending_tenant' && (
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs"
                onClick={() => onConfirmClosure(request.id)}
              >
                確認結案
              </Button>
            )}
            {request.status === 'open' && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                onClick={() => onCancel(request.id)}
              >
                取消
              </Button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[#666666] hover:text-white transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-[#333333] space-y-3">
            <div>
              <p className="text-xs text-[#666666] mb-1">問題描述</p>
              <p className="text-[#cccccc] text-sm">{request.description}</p>
            </div>
            {request.notes && (
              <div>
                <p className="text-xs text-[#666666] mb-1">房東備註</p>
                <p className="text-[#cccccc] text-sm">{request.notes}</p>
              </div>
            )}
            {request.scheduledDate && (
              <div>
                <p className="text-xs text-[#666666] mb-1">預約維修時間</p>
                <p className="text-[#cccccc] text-sm">
                  {new Date(request.scheduledDate).toLocaleString('zh-TW', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            )}
            {(request.actualCost != null || request.estimatedCost != null) && (
              <div>
                <p className="text-xs text-[#666666] mb-1">費用</p>
                <p className="text-[#cccccc] text-sm">
                  {request.actualCost != null
                    ? `實際 NT$ ${Number(request.actualCost).toLocaleString('zh-TW')}`
                    : request.estimatedCost != null
                      ? `預估 NT$ ${Number(request.estimatedCost).toLocaleString('zh-TW')}`
                      : '—'}
                </p>
              </div>
            )}
            <p className="text-xs text-[#666666]">
              提交於 {new Date(request.createdAt).toLocaleDateString('zh-TW')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TenantMaintenancePage() {
  const { showToast } = useToast()
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { category: 'other', priority: 'medium' },
  })

  // Load active lease property + existing requests
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data: lease } = await supabase
            .from('lease_agreements')
            .select('property_id')
            .eq('tenant_id', user.id)
            .eq('status', 'active')
            .single()

          if (lease) setActivePropertyId(lease.property_id as string)
        }

        const data = await getMyMaintenanceRequests()
        setRequests(data)
      } catch {
        // silently fail — show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const onSubmit = async (data: FormData) => {
    if (!activePropertyId) {
      showToast({ type: 'error', message: '找不到您的租約物件，請聯絡房東' })
      return
    }

    setSubmitting(true)
    const result = await createMaintenanceRequest({
      propertyId: activePropertyId,
      ...data,
    })
    setSubmitting(false)

    if (result.success) {
      showToast({ type: 'success', message: '維修申請已送出', description: '房東將盡快回覆' })
      reset()
      setShowForm(false)
      const updated = await getMyMaintenanceRequests()
      setRequests(updated)
    } else {
      showToast({ type: 'error', message: result.error ?? '提交失敗，請重試' })
    }
  }

  const handleConfirmClosure = async (id: string) => {
    const result = await confirmMaintenanceClosureByTenant(id)
    if (result.success) {
      showToast({
        type: 'success',
        message: '已確認結案',
        description: '房東開啟維修管理頁面後，維修費用將寫入收支流水（若已填寫金額）。',
      })
      const updated = await getMyMaintenanceRequests()
      setRequests(updated)
    } else {
      showToast({ type: 'error', message: result.error ?? '確認失敗' })
    }
  }

  const handleCancel = async (id: string) => {
    const result = await cancelMaintenanceRequest(id)
    if (result.success) {
      showToast({ type: 'success', message: '申請已取消' })
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' as const } : r))
      )
    } else {
      showToast({ type: 'error', message: result.error ?? '取消失敗' })
    }
  }

  const filtered =
    statusFilter === 'all'
      ? requests
      : requests.filter((r) => r.status === statusFilter)

  const counts = {
    open: requests.filter((r) => r.status === 'open').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    pending_tenant: requests.filter((r) => r.status === 'pending_tenant').length,
    completed: requests.filter((r) => r.status === 'completed').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">維修申請</h1>
          <p className="text-[#999999]">回報物件問題，追蹤維修進度</p>
        </div>
        {!showForm && activePropertyId && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            新增申請
          </Button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { key: 'open', label: '待處理', color: 'text-yellow-400' },
          { key: 'in_progress', label: '處理中', color: 'text-blue-400' },
          { key: 'pending_tenant', label: '待確認', color: 'text-violet-300' },
          { key: 'completed', label: '已完成', color: 'text-green-400' },
        ].map(({ key, label, color }) => (
          <Card
            key={key}
            className={`bg-[#262626] border-[#333333] cursor-pointer transition-colors ${
              statusFilter === key ? 'border-[#7C3AED]' : 'hover:border-[#444444]'
            }`}
            onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
          >
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>
                {counts[key as keyof typeof counts]}
              </p>
              <p className="text-[#999999] text-sm mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submission Form */}
      {showForm && (
        <Card className="bg-[#262626] border-[#7C3AED]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-lg">新增維修申請</CardTitle>
            <button
              onClick={() => {
                setShowForm(false)
                reset()
              }}
              className="text-[#666666] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <Label className="text-[#cccccc] mb-1.5 block">問題類別</Label>
                  <select
                    {...register('category')}
                    className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED]"
                  >
                    {(Object.keys(CATEGORY_LABELS) as MaintenanceCategory[]).map((k) => (
                      <option key={k} value={k}>
                        {CATEGORY_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <Label className="text-[#cccccc] mb-1.5 block">緊急程度</Label>
                  <select
                    {...register('priority')}
                    className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED]"
                  >
                    {(Object.keys(PRIORITY_LABELS) as MaintenancePriority[]).map((k) => (
                      <option key={k} value={k}>
                        {PRIORITY_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <Label className="text-[#cccccc] mb-1.5 block">問題標題</Label>
                <Input
                  {...register('title')}
                  placeholder="例：廚房水龍頭漏水"
                  className="bg-[#1A1A1A] border-[#333333] text-white placeholder:text-[#666666] focus:border-[#7C3AED]"
                />
                {errors.title && (
                  <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label className="text-[#cccccc] mb-1.5 block">問題描述</Label>
                <textarea
                  {...register('description')}
                  rows={4}
                  placeholder="請詳細描述問題發生的位置、情況及您已嘗試的處理方式..."
                  className="w-full bg-[#1A1A1A] border border-[#333333] text-white placeholder:text-[#666666] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] resize-none"
                />
                {errors.description && (
                  <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>
                )}
              </div>

              {!activePropertyId && (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                  <p className="text-yellow-400 text-sm">找不到您的租約物件，請聯絡房東確認您的租約狀態</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    reset()
                  }}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !activePropertyId}
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      送出中...
                    </>
                  ) : (
                    '送出申請'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Request List */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-[#262626] border-[#333333]">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Wrench className="w-14 h-14 text-[#444444] mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {statusFilter === 'all' ? '目前沒有維修記錄' : `沒有「${STATUS_CONFIG[statusFilter]?.label}」的申請`}
            </h3>
            <p className="text-[#666666] text-sm mb-6">
              如有物件問題，請點擊「新增申請」告知房東
            </p>
            {statusFilter !== 'all' && (
              <Button variant="outline" onClick={() => setStatusFilter('all')}>
                顯示全部
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              onCancel={handleCancel}
              onConfirmClosure={handleConfirmClosure}
            />
          ))}
        </div>
      )}
    </div>
  )
}
