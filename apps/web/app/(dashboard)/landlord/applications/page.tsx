'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Mail,
  Briefcase,
  Users,
  PawPrint,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useToast } from '@/components/ui/Toast'
import {
  getLandlordApplications,
  reviewApplication,
  type RentalApplication,
  type ApplicationStatus,
} from '@/lib/actions/applications'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  draft: { label: '草稿', variant: 'default' },
  submitted: { label: '待審核', variant: 'warning' },
  under_review: { label: '審核中', variant: 'info' },
  approved: { label: '已核准', variant: 'success' },
  rejected: { label: '已婉拒', variant: 'error' },
  withdrawn: { label: '已撤回', variant: 'default' },
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  employed: '受雇員工',
  self_employed: '自雇 / 創業',
  student: '學生',
  other: '其他',
}

// ─── Rejection Modal ──────────────────────────────────────────────────────────

function RejectModal({
  onConfirm,
  onCancel,
  processing,
}: {
  onConfirm: (reason: string) => void
  onCancel: () => void
  processing: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#262626] border border-[#333333] rounded-xl p-6 w-full max-w-md mx-4 space-y-4">
        <h3 className="text-white font-semibold text-lg">婉拒申請</h3>
        <p className="text-[#999999] text-sm">請填寫婉拒原因（選填），此訊息將 Email 通知申請人。</p>
        <div>
          <Label className="text-[#cccccc] mb-1.5 block text-sm">婉拒原因</Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="例：目前已有其他申請人優先考慮、物件暫緩出租..."
            className="w-full bg-[#1A1A1A] border border-[#333333] text-white placeholder:text-[#555555] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] resize-none"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            取消
          </Button>
          <Button
            disabled={processing}
            onClick={() => onConfirm(reason)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : '確認婉拒'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  onApprove,
  onReject,
}: {
  app: RentalApplication
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const config = STATUS_CONFIG[app.status]
  const canAct = app.status === 'submitted' || app.status === 'under_review'

  return (
    <Card className="bg-[#262626] border-[#333333]">
      <CardContent className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant={config.variant}>{config.label}</Badge>
              <span className="text-xs text-[#666666]">
                #{app.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            <h3 className="text-white font-semibold">{app.applicantName}</h3>
            <p className="text-[#999999] text-sm mt-0.5">{app.propertyAddress}</p>

            <div className="flex flex-wrap gap-4 mt-2 text-sm text-[#cccccc]">
              <span>
                <span className="text-[#666666]">出價：</span>
                NT$ {app.offerAmount.toLocaleString()} / 月
              </span>
              <span>
                <span className="text-[#666666]">租期：</span>
                {app.leaseTermMonths} 個月
              </span>
              {app.submittedAt && (
                <span className="text-[#666666] text-xs">
                  送出 {new Date(app.submittedAt).toLocaleDateString('zh-TW')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canAct && (
              <>
                <Button
                  size="sm"
                  onClick={() => onApprove(app.id)}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  核准
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(app.id)}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  婉拒
                </Button>
              </>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[#666666] hover:text-white transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded applicant details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[#333333] space-y-3">
            <p className="text-xs text-[#666666] uppercase tracking-wide font-medium">
              申請人詳細資料
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {app.applicantPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-[#666666]" />
                  <span className="text-[#cccccc]">{app.applicantPhone}</span>
                </div>
              )}
              {app.applicantEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-[#666666]" />
                  <span className="text-[#cccccc]">{app.applicantEmail}</span>
                </div>
              )}
              {app.employmentStatus && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-[#666666]" />
                  <span className="text-[#cccccc]">
                    {EMPLOYMENT_LABELS[app.employmentStatus] ?? app.employmentStatus}
                  </span>
                </div>
              )}
              {app.monthlyIncome != null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#666666] text-xs">月收入：</span>
                  <span className="text-[#cccccc]">
                    NT$ {app.monthlyIncome.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-[#666666]" />
                <span className="text-[#cccccc]">同住 {app.occupantsCount} 人</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <PawPrint className="w-4 h-4 text-[#666666]" />
                <span className="text-[#cccccc]">{app.hasPets ? '有寵物' : '無寵物'}</span>
              </div>
            </div>

            {app.desiredMoveIn && (
              <p className="text-sm text-[#cccccc]">
                <span className="text-[#666666]">預計入住：</span>
                {new Date(app.desiredMoveIn).toLocaleDateString('zh-TW')}
              </p>
            )}

            {app.additionalNotes && (
              <div>
                <p className="text-xs text-[#666666] mb-1">補充說明</p>
                <p className="text-[#cccccc] text-sm bg-[#1A1A1A] rounded p-3">
                  {app.additionalNotes}
                </p>
              </div>
            )}

            {app.status === 'rejected' && app.rejectionReason && (
              <div>
                <p className="text-xs text-[#666666] mb-1">婉拒原因</p>
                <p className="text-red-400 text-sm">{app.rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Filter = ApplicationStatus | 'all' | 'pending'

export default function LandlordApplicationsPage() {
  const { showToast } = useToast()
  const [applications, setApplications] = useState<RentalApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getLandlordApplications()
    setApplications(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load])

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    const result = await reviewApplication(id, 'approved')
    setProcessingId(null)

    if (result.success) {
      showToast({ type: 'success', message: '已核准申請', description: '申請人將收到 Email 通知' })
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'approved' as const } : a))
      )
    } else {
      showToast({ type: 'error', message: result.error ?? '操作失敗' })
    }
  }

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return
    setProcessingId(rejectTarget)
    const result = await reviewApplication(rejectTarget, 'rejected', reason || undefined)
    setProcessingId(null)
    setRejectTarget(null)

    if (result.success) {
      showToast({ type: 'success', message: '已婉拒申請', description: '申請人將收到 Email 通知' })
      setApplications((prev) =>
        prev.map((a) =>
          a.id === rejectTarget
            ? { ...a, status: 'rejected' as const, rejectionReason: reason || null }
            : a
        )
      )
    } else {
      showToast({ type: 'error', message: result.error ?? '操作失敗' })
    }
  }

  const pendingCount = applications.filter(
    (a) => a.status === 'submitted' || a.status === 'under_review'
  ).length

  const filtered =
    filter === 'all'
      ? applications
      : filter === 'pending'
        ? applications.filter((a) => a.status === 'submitted' || a.status === 'under_review')
        : applications.filter((a) => a.status === filter)

  return (
    <div className="space-y-6">
      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
          processing={processingId === rejectTarget}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">租賃申請審核</h1>
          <p className="text-[#999999]">審核租客提交的申請，核准或婉拒</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">
              {pendingCount} 件待審核
            </span>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: 'pending', label: `待審核（${pendingCount}）` },
            { key: 'approved', label: '已核准' },
            { key: 'rejected', label: '已婉拒' },
            { key: 'all', label: '全部' },
          ] as { key: Filter; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#999999] hover:text-white bg-[#262626] border border-[#333333]'
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
            <FileText className="w-14 h-14 text-[#444444] mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {filter === 'pending' ? '目前沒有待審核申請' : '沒有符合的申請記錄'}
            </h3>
            <p className="text-[#666666] text-sm">
              當租客送出申請後，申請會出現在這裡
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onApprove={handleApprove}
              onReject={(id) => setRejectTarget(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
