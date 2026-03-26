'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
  Send,
  RotateCcw,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import {
  getMyApplications,
  submitApplication,
  withdrawApplication,
  type RentalApplication,
  type ApplicationStatus,
} from '@/lib/actions/applications'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; icon: React.ReactNode; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  draft: {
    label: '草稿',
    icon: <FileText className="w-3.5 h-3.5" />,
    variant: 'default',
  },
  submitted: {
    label: '已送出',
    icon: <Send className="w-3.5 h-3.5" />,
    variant: 'info',
  },
  under_review: {
    label: '審核中',
    icon: <Clock className="w-3.5 h-3.5" />,
    variant: 'warning',
  },
  approved: {
    label: '已核准',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    variant: 'success',
  },
  rejected: {
    label: '已婉拒',
    icon: <XCircle className="w-3.5 h-3.5" />,
    variant: 'error',
  },
  withdrawn: {
    label: '已撤回',
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    variant: 'default',
  },
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  employed: '受雇員工',
  self_employed: '自雇/創業',
  student: '學生',
  other: '其他',
}

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  onSubmit,
  onWithdraw,
}: {
  app: RentalApplication
  onSubmit: (id: string) => Promise<void>
  onWithdraw: (id: string) => Promise<void>
}) {
  const [acting, setActing] = useState(false)
  const config = STATUS_CONFIG[app.status]

  const handleSubmit = async () => {
    setActing(true)
    await onSubmit(app.id)
    setActing(false)
  }

  const handleWithdraw = async () => {
    setActing(true)
    await onWithdraw(app.id)
    setActing(false)
  }

  return (
    <Card className="bg-[#262626] border-[#333333] overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Property image */}
        {app.propertyImage && (
          <div className="w-full md:w-48 h-32 md:h-auto relative shrink-0">
            <img
              src={app.propertyImage}
              alt={app.propertyTitle}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <CardContent className="flex-1 p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2 flex-1">
              {/* Status + ID */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={config.variant}>
                  <span className="flex items-center gap-1.5">
                    {config.icon}
                    {config.label}
                  </span>
                </Badge>
                <span className="text-xs text-[#666666]">#{app.id.slice(0, 8)}</span>
              </div>

              {/* Property */}
              <h3 className="text-lg font-bold text-white">{app.propertyTitle}</h3>
              <p className="text-[#999999] text-sm">{app.propertyAddress}</p>

              {/* Details row */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[#cccccc]">
                <div>
                  <span className="text-[#999999]">出價：</span>
                  <span className="font-semibold">NT$ {app.offerAmount.toLocaleString()} / 月</span>
                </div>
                <div>
                  <span className="text-[#999999]">租期：</span>
                  <span>{app.leaseTermMonths} 個月</span>
                </div>
                {app.desiredMoveIn && (
                  <div>
                    <span className="text-[#999999]">預計入住：</span>
                    <span>{new Date(app.desiredMoveIn).toLocaleDateString('zh-TW')}</span>
                  </div>
                )}
              </div>

              {/* Submission date */}
              {app.submittedAt && (
                <div className="flex items-center gap-1.5 text-xs text-[#666666]">
                  <Clock className="w-3.5 h-3.5" />
                  送出於 {new Date(app.submittedAt).toLocaleDateString('zh-TW')}
                </div>
              )}

              {/* Rejection reason */}
              {app.status === 'rejected' && app.rejectionReason && (
                <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-red-400 text-xs">
                    <span className="font-medium">拒絕原因：</span>
                    {app.rejectionReason}
                  </p>
                </div>
              )}

              {/* Approval message */}
              {app.status === 'approved' && (
                <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                  <p className="text-green-400 text-xs font-medium">
                    恭喜！您的申請已通過，請等候房東聯絡您進行簽約
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {app.status === 'draft' && (
                <>
                  <Link href={`/tenant/potential/applications/${app.id}/edit`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#333333] text-white hover:bg-[#333333]"
                    >
                      繼續填寫
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    disabled={acting}
                    onClick={handleSubmit}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                  >
                    {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '送出申請'}
                  </Button>
                </>
              )}

              {(app.status === 'submitted' || app.status === 'under_review') && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={acting}
                  onClick={handleWithdraw}
                  className="border-[#333333] text-[#999999] hover:bg-[#333333] hover:text-white"
                >
                  {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '撤回申請'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const { showToast } = useToast()
  const [applications, setApplications] = useState<RentalApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')

  const load = async () => {
    setLoading(true)
    const data = await getMyApplications()
    setApplications(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (id: string) => {
    const result = await submitApplication(id)
    if (result.success) {
      showToast({ type: 'success', message: '申請已送出', description: '等候房東審核' })
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: 'submitted' as const, submittedAt: new Date().toISOString() }
            : a
        )
      )
    } else {
      showToast({ type: 'error', message: result.error ?? '送出失敗' })
    }
  }

  const handleWithdraw = async (id: string) => {
    const result = await withdrawApplication(id)
    if (result.success) {
      showToast({ type: 'success', message: '申請已撤回' })
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'withdrawn' as const } : a))
      )
    } else {
      showToast({ type: 'error', message: result.error ?? '撤回失敗' })
    }
  }

  const filtered =
    statusFilter === 'all'
      ? applications
      : applications.filter((a) => a.status === statusFilter)

  const activeCount = applications.filter(
    (a) => !['rejected', 'withdrawn'].includes(a.status)
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">租賃申請</h1>
          <p className="text-[#999999]">追蹤您的租賃要約書與申請進度</p>
        </div>
        <Link href="/tenant/potential/properties">
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
            <FileText className="w-4 h-4 mr-2" />
            瀏覽物件
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      {applications.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: 'all', label: `全部（${applications.length}）` },
              { key: 'draft', label: '草稿' },
              { key: 'submitted', label: '已送出' },
              { key: 'under_review', label: '審核中' },
              { key: 'approved', label: '已核准' },
              { key: 'rejected', label: '已婉拒' },
            ] as { key: ApplicationStatus | 'all'; label: string }[]
          ).map(({ key, label }) => {
            const count =
              key === 'all'
                ? applications.length
                : applications.filter((a) => a.status === key).length
            if (key !== 'all' && count === 0) return null
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === key
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-[#999999] hover:text-white bg-[#262626] border border-[#333333]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-[#262626] border-[#333333]">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-16 h-16 text-[#444444] mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">目前沒有申請記錄</h3>
            <p className="text-[#999999] mb-6">
              您可以在房東邀請的物件頁面遞交租賃要約書
            </p>
            <Link href="/tenant/potential/properties">
              <Button variant="outline">瀏覽物件</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onSubmit={handleSubmit}
              onWithdraw={handleWithdraw}
            />
          ))}
        </div>
      )}
    </div>
  )
}
