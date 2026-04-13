'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
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
  CalendarClock,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import {
  getLandlordMaintenanceRequests,
  getMaintenanceAssigneeOptions,
  updateMaintenanceRequest,
  type MaintenanceRequest,
  type MaintenanceStatus,
  type MaintenanceCategory,
  type MaintenancePriority,
  type MaintenanceAssigneeOption,
  type UpdateMaintenanceInput,
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

const PRIORITY_BADGE: Record<MaintenancePriority, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
}

const PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  low: '一般',
  medium: '中等',
  high: '緊急',
  urgent: '非常緊急',
}

const STATUS_BADGE: Record<
  MaintenanceStatus,
  { label: string; icon: React.ReactNode; variant: 'warning' | 'info' | 'success' | 'secondary' }
> = {
  open: {
    label: '待處理',
    icon: <Clock className="w-3.5 h-3.5" />,
    variant: 'warning',
  },
  in_progress: {
    label: '處理中',
    icon: <Wrench className="w-3.5 h-3.5" />,
    variant: 'info',
  },
  completed: {
    label: '已完成',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    variant: 'success',
  },
  cancelled: {
    label: '已取消',
    icon: <XCircle className="w-3.5 h-3.5" />,
    variant: 'secondary',
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

function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalDatetimeInput(local: string): string | null {
  const t = local.trim()
  if (!t) return null
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function formatVisit(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-TW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const config = STATUS_BADGE[status]
  return (
    <Badge variant={config.variant} className="inline-flex items-center gap-1.5 rounded-full border border-border-default">
      {config.icon}
      {config.label}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  return <Badge variant={PRIORITY_BADGE[priority]}>{PRIORITY_LABELS[priority]}</Badge>
}

// ─── Dispatch form (shared) ────────────────────────────────────────────────────

function DispatchFields({
  request,
  assigneeOptions,
  onPersist,
}: {
  request: MaintenanceRequest
  assigneeOptions: MaintenanceAssigneeOption[]
  onPersist: (patch: UpdateMaintenanceInput) => Promise<boolean>
}) {
  const [notesInput, setNotesInput] = useState(request.notes ?? '')
  const [estimatedCost, setEstimatedCost] = useState(
    request.estimatedCost != null ? String(request.estimatedCost) : ''
  )
  const [actualCost, setActualCost] = useState(
    request.actualCost != null ? String(request.actualCost) : ''
  )
  const [scheduledLocal, setScheduledLocal] = useState(toLocalDatetimeInput(request.scheduledDate))
  const [assignedToId, setAssignedToId] = useState<string>(request.assignedToId ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNotesInput(request.notes ?? '')
    setEstimatedCost(request.estimatedCost != null ? String(request.estimatedCost) : '')
    setActualCost(request.actualCost != null ? String(request.actualCost) : '')
    setScheduledLocal(toLocalDatetimeInput(request.scheduledDate))
    setAssignedToId(request.assignedToId ?? '')
  }, [request])

  const fieldClass =
    'w-full rounded-md border border-border-default bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'

  const saveDispatch = async () => {
    setSaving(true)
    const est =
      estimatedCost.trim() === '' ? null : Number.parseFloat(estimatedCost.replace(/,/g, ''))
    const act = actualCost.trim() === '' ? null : Number.parseFloat(actualCost.replace(/,/g, ''))
    const ok = await onPersist({
      status: request.status,
      notes: notesInput || undefined,
      estimatedCost: est !== null && !Number.isNaN(est) ? est : undefined,
      actualCost: act !== null && !Number.isNaN(act) ? act : null,
      scheduledDate: fromLocalDatetimeInput(scheduledLocal),
      assignedToId: assignedToId === '' ? null : assignedToId,
    })
    setSaving(false)
    return ok
  }

  const nextStatus = NEXT_STATUS[request.status]

  const advance = async () => {
    if (!nextStatus) return
    setSaving(true)
    const ok = await onPersist({
      status: nextStatus,
      notes: notesInput || undefined,
      estimatedCost:
        estimatedCost.trim() === ''
          ? undefined
          : Number.parseFloat(estimatedCost.replace(/,/g, '')) || undefined,
      actualCost:
        actualCost.trim() === ''
          ? null
          : Number.parseFloat(actualCost.replace(/,/g, '')) || null,
      scheduledDate: fromLocalDatetimeInput(scheduledLocal),
      assignedToId: assignedToId === '' ? null : assignedToId,
    })
    setSaving(false)
    return ok
  }

  return (
    <div className="space-y-4 border-t border-border-default pt-4 mt-4">
      <p className="text-xs text-text-secondary">
        租客會在 App／網頁看到備註與預約到訪時間。若廠商尚無系統帳號，請將聯絡方式寫在備註。
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs text-text-secondary">
            <CalendarClock className="h-3.5 w-3.5" />
            預約到訪時間
          </label>
          <input
            type="datetime-local"
            value={scheduledLocal}
            onChange={(e) => setScheduledLocal(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs text-text-secondary">
            <UserRound className="h-3.5 w-3.5" />
            指派處理人（系統帳號）
          </label>
          <select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            className={fieldClass}
          >
            <option value="">未指派</option>
            {assigneeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">預估費用 (NT$)</label>
          <input
            type="number"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            placeholder="例如 1500"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">實際費用 (NT$)</label>
          <input
            type="number"
            value={actualCost}
            onChange={(e) => setActualCost(e.target.value)}
            placeholder="結案時填寫"
            className={fieldClass}
            disabled={request.status === 'cancelled'}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-text-secondary">工作說明／備註（租客可見）</label>
        <textarea
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          rows={3}
          placeholder="例：已聯絡水電，週三 14:00 到場；更換零件型號…"
          className={`${fieldClass} resize-none`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving || request.status === 'cancelled'}
          onClick={() => void saveDispatch()}
        >
          {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
          儲存派工資料
        </Button>
        {nextStatus && request.status !== 'cancelled' ? (
          <Button type="button" size="sm" disabled={saving} onClick={() => void advance()}>
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            {NEXT_STATUS_LABEL[request.status]}
          </Button>
        ) : null}
      </div>

      {request.status === 'completed' ? (
        <p className="text-xs text-text-muted">
          結案後請至財務流水確認「維修」類支出是否已自動帶入；若尚未串接，請手動補登。
        </p>
      ) : null}
    </div>
  )
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function RequestCard({
  request,
  assigneeOptions,
  onPersist,
}: {
  request: MaintenanceRequest
  assigneeOptions: MaintenanceAssigneeOption[]
  onPersist: (id: string, patch: UpdateMaintenanceInput) => Promise<boolean>
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="border-border-default bg-bg-secondary md:hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
              <span className="text-xs text-text-muted">{CATEGORY_LABELS[request.category]}</span>
            </div>
            <h3 className="font-semibold text-text-primary">{request.title}</h3>
            <p className="mt-0.5 text-sm text-text-secondary">{request.propertyAddress}</p>
            <p className="mt-1 text-xs text-text-muted">
              申請人：{request.requestedByName} · {new Date(request.createdAt).toLocaleDateString('zh-TW')}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              預約：{formatVisit(request.scheduledDate)} · 指派：
              {request.assignedToName ?? '未指派'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-text-muted transition-colors hover:text-text-primary"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {expanded ? (
          <div>
            <div className="mt-3">
              <p className="mb-1 text-xs text-text-muted">問題描述</p>
              <p className="text-sm text-text-secondary">{request.description}</p>
            </div>
            <DispatchFields
              request={request}
              assigneeOptions={assigneeOptions}
              onPersist={(patch) => onPersist(request.id, patch)}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

// ─── Desktop table ────────────────────────────────────────────────────────────

function DesktopTable({
  requests,
  assigneeOptions,
  expandedId,
  setExpandedId,
  onPersist,
}: {
  requests: MaintenanceRequest[]
  assigneeOptions: MaintenanceAssigneeOption[]
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  onPersist: (id: string, patch: UpdateMaintenanceInput) => Promise<boolean>
}) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border-default md:block">
      <table className="w-full min-w-[880px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-default bg-bg-tertiary text-text-secondary">
            <th className="px-4 py-3 font-medium">狀態</th>
            <th className="px-4 py-3 font-medium">優先</th>
            <th className="px-4 py-3 font-medium">問題</th>
            <th className="px-4 py-3 font-medium">物件</th>
            <th className="px-4 py-3 font-medium">申請人</th>
            <th className="px-4 py-3 font-medium">申請日</th>
            <th className="px-4 py-3 font-medium">預約到訪</th>
            <th className="px-4 py-3 font-medium">指派</th>
            <th className="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <Fragment key={r.id}>
              <tr
                className="border-b border-border-default bg-bg-secondary transition-colors hover:bg-bg-tertiary/60"
              >
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 align-top">
                  <PriorityBadge priority={r.priority} />
                </td>
                <td className="max-w-[200px] px-4 py-3 align-top">
                  <div className="font-medium text-text-primary">{r.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-text-muted">{r.description}</div>
                </td>
                <td className="max-w-[160px] px-4 py-3 align-top text-text-secondary">{r.propertyAddress}</td>
                <td className="px-4 py-3 align-top text-text-secondary">{r.requestedByName}</td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-text-muted">
                  {new Date(r.createdAt).toLocaleDateString('zh-TW')}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-text-muted">
                  {formatVisit(r.scheduledDate)}
                </td>
                <td className="px-4 py-3 align-top text-text-muted">{r.assignedToName ?? '—'}</td>
                <td className="px-4 py-3 align-top text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    {expandedId === r.id ? '收合' : '派工'}
                  </Button>
                </td>
              </tr>
              {expandedId === r.id ? (
                <tr className="border-b border-border-default bg-bg-primary">
                  <td colSpan={9} className="px-4 py-4">
                    <DispatchFields
                      request={r}
                      assigneeOptions={assigneeOptions}
                      onPersist={(patch) => onPersist(r.id, patch)}
                    />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Filter = 'all' | MaintenanceStatus

export default function LandlordMaintenancePage() {
  const { showToast } = useToast()
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [assigneeOptions, setAssigneeOptions] = useState<MaintenanceAssigneeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [data, options] = await Promise.all([
      getLandlordMaintenanceRequests(),
      getMaintenanceAssigneeOptions(),
    ])
    setRequests(data)
    setAssigneeOptions(options)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load])

  const persist = async (id: string, patch: UpdateMaintenanceInput): Promise<boolean> => {
    const result = await updateMaintenanceRequest(id, patch)
    if (result.success) {
      showToast({ type: 'success', message: '已更新' })
      await load()
      return true
    }
    showToast({ type: 'error', message: result.error ?? '更新失敗' })
    return false
  }

  const counts = {
    all: requests.length,
    open: requests.filter((r) => r.status === 'open').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    cancelled: requests.filter((r) => r.status === 'cancelled').length,
  }

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter)

  const urgentCount = requests.filter((r) => r.priority === 'urgent' && r.status === 'open').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold text-text-primary">維修派工管理</h1>
          <p className="text-text-secondary">檢視租客申請、排程到訪、指派處理人並追蹤結案</p>
        </div>
        {urgentCount > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-secondary px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning">{urgentCount} 件非常緊急待處理</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            { key: 'open', label: '待處理', accent: 'text-accent' },
            { key: 'in_progress', label: '處理中', accent: 'text-text-primary' },
            { key: 'completed', label: '已完成', accent: 'text-success' },
            { key: 'all', label: '全部', accent: 'text-text-secondary' },
          ] as { key: Filter; label: string; accent: string }[]
        ).map(({ key, label, accent }) => (
          <Card
            key={key}
            className={`cursor-pointer border-border-default bg-bg-secondary transition-colors hover:border-accent ${
              filter === key ? 'ring-1 ring-accent' : ''
            }`}
            onClick={() => setFilter(key)}
          >
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${accent}`}>{counts[key]}</p>
              <p className="mt-1 text-sm text-text-secondary">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-text-muted" />
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
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border-default bg-bg-secondary">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Wrench className="mb-4 h-14 w-14 text-text-muted" />
            <h3 className="mb-2 text-lg font-semibold text-text-primary">目前沒有維修申請</h3>
            <p className="text-sm text-text-muted">當租客回報物件問題後，申請會顯示在這裡</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <DesktopTable
            requests={filtered}
            assigneeOptions={assigneeOptions}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            onPersist={persist}
          />
          <div className="space-y-3 md:hidden">
            {filtered.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                assigneeOptions={assigneeOptions}
                onPersist={persist}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
