'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wrench,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import {
  getLandlordMaintenanceRequests,
  updateMaintenanceRequest,
  type MaintenanceRequest,
  type MaintenanceStatus,
  type MaintenanceCategory,
  type MaintenancePriority,
} from '@/lib/actions/maintenance'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: '水管/排水',
  electrical: '電氣/照明',
  hvac: '冷暖氣/通風',
  appliance: '家電設備',
  structural: '門窗/結構',
  other: '其他',
}

const PRIORITY_STYLES: Record<MaintenancePriority, string> = {
  low: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  low: '一般',
  medium: '中等',
  high: '緊急',
  urgent: '非常緊急',
}

const STATUS_CONFIG: Record<
  MaintenanceStatus,
  { label: string; icon: React.ReactNode; style: string }
> = {
  open: {
    label: '待處理',
    icon: <Clock className="w-3.5 h-3.5" />,
    style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  in_progress: {
    label: '處理中',
    icon: <Wrench className="w-3.5 h-3.5" />,
    style: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  completed: {
    label: '已完成',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    style: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  cancelled: {
    label: '已取消',
    icon: <XCircle className="w-3.5 h-3.5" />,
    style: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
}

const NEXT_STATUS: Partial<Record<MaintenanceStatus, MaintenanceStatus>> = {
  open: 'in_progress',
  in_progress: 'completed',
}

const NEXT_STATUS_LABEL: Partial<Record<MaintenanceStatus, string>> = {
  open: '開始處理',
  in_progress: '標記完成',
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const config = STATUS_CONFIG[status]
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
  onStatusChange,
}: {
  request: MaintenanceRequest
  onStatusChange: (id: string, status: MaintenanceStatus, notes?: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [notesInput, setNotesInput] = useState(request.notes ?? '')
  const [estimatedCost, setEstimatedCost] = useState(
    request.estimatedCost ? String(request.estimatedCost) : ''
  )

  const nextStatus = NEXT_STATUS[request.status]

  const handleAdvance = async () => {
    if (!nextStatus) return
    setUpdating(true)
    await onStatusChange(request.id, nextStatus, notesInput || undefined)
    setUpdating(false)
  }

  return (
    <Card className="bg-[#262626] border-[#333333]">
      <CardContent className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
              <span className="text-xs text-[#666666]">{CATEGORY_LABELS[request.category]}</span>
            </div>
            <h3 className="text-white font-semibold">{request.title}</h3>
            <p className="text-[#999999] text-sm mt-0.5">{request.propertyAddress}</p>
            <p className="text-[#666666] text-xs mt-1">
              租客：{request.requestedByName} ·{' '}
              {new Date(request.createdAt).toLocaleDateString('zh-TW')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {nextStatus && (
              <Button
                size="sm"
                onClick={handleAdvance}
                disabled={updating}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs"
              >
                {updating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  NEXT_STATUS_LABEL[request.status]
                )}
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

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[#333333] space-y-4">
            <div>
              <p className="text-xs text-[#666666] mb-1">租客描述</p>
              <p className="text-[#cccccc] text-sm">{request.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Estimated cost input */}
              <div>
                <label className="text-xs text-[#666666] block mb-1">預估費用 (NT$)</label>
                <input
                  type="number"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="輸入預估金額"
                  className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              {/* Completed date display */}
              {request.completedDate && (
                <div>
                  <p className="text-xs text-[#666666] mb-1">完成日期</p>
                  <p className="text-[#cccccc] text-sm pt-2">
                    {new Date(request.completedDate).toLocaleDateString('zh-TW')}
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-[#666666] block mb-1">備註（租客可見）</label>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={2}
                placeholder="例：已聯絡水電師傅，預計週三來處理..."
                className="w-full bg-[#1A1A1A] border border-[#333333] text-white placeholder:text-[#555555] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] resize-none"
              />
            </div>

            {/* Save notes button (when no next status transition available) */}
            {!nextStatus && request.status !== 'cancelled' && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updating}
                  onClick={async () => {
                    setUpdating(true)
                    await onStatusChange(
                      request.id,
                      request.status,
                      notesInput || undefined
                    )
                    setUpdating(false)
                  }}
                >
                  {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  儲存備註
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Filter = 'all' | MaintenanceStatus

export default function LandlordMaintenancePage() {
  const { showToast } = useToast()
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getLandlordMaintenanceRequests()
    setRequests(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load])

  const handleStatusChange = async (
    id: string,
    status: MaintenanceStatus,
    notes?: string
  ) => {
    const result = await updateMaintenanceRequest(id, { status, notes })
    if (result.success) {
      showToast({ type: 'success', message: '已更新維修狀態' })
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                notes: notes ?? r.notes,
                completedDate:
                  status === 'completed' ? new Date().toISOString() : r.completedDate,
              }
            : r
        )
      )
    } else {
      showToast({ type: 'error', message: result.error ?? '更新失敗' })
    }
  }

  const counts = {
    all: requests.length,
    open: requests.filter((r) => r.status === 'open').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    cancelled: requests.filter((r) => r.status === 'cancelled').length,
  }

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter)

  const urgentCount = requests.filter(
    (r) => r.priority === 'urgent' && r.status === 'open'
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">維修管理</h1>
          <p className="text-[#999999]">處理租客回報的物件問題</p>
        </div>
        {urgentCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">
              {urgentCount} 件非常緊急待處理
            </span>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(
          [
            { key: 'open', label: '待處理', color: 'text-yellow-400' },
            { key: 'in_progress', label: '處理中', color: 'text-blue-400' },
            { key: 'completed', label: '已完成', color: 'text-green-400' },
            { key: 'all', label: '全部', color: 'text-white' },
          ] as { key: Filter; label: string; color: string }[]
        ).map(({ key, label, color }) => (
          <Card
            key={key}
            className={`bg-[#262626] border-[#333333] cursor-pointer transition-colors ${
              filter === key ? 'border-[#7C3AED]' : 'hover:border-[#444444]'
            }`}
            onClick={() => setFilter(key)}
          >
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{counts[key]}</p>
              <p className="text-[#999999] text-sm mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-[#666666]" />
        {(
          [
            { key: 'all', label: '全部' },
            { key: 'open', label: '待處理' },
            { key: 'in_progress', label: '處理中' },
            { key: 'completed', label: '已完成' },
          ] as { key: Filter; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#999999] hover:text-white hover:bg-[#333333]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-[#262626] border-[#333333]">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Wrench className="w-14 h-14 text-[#444444] mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">目前沒有維修申請</h3>
            <p className="text-[#666666] text-sm">
              當租客回報物件問題後，申請會顯示在這裡
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RequestCard key={r.id} request={r} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  )
}
