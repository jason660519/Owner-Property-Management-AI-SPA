'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Loader2,
  MapPin,
  Save,
  Send,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import {
  getApplicationById,
  updateApplicationDraft,
  submitApplication,
  type RentalApplication,
} from '@/lib/actions/applications'
import { createClient } from '@/lib/supabase/client'

// ─── Form Schema ──────────────────────────────────────────────────────────────

const toNum = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v))

const schema = z.object({
  applicantName: z.string().min(2, '姓名至少 2 個字'),
  applicantPhone: z.string().optional(),
  applicantEmail: z.string().optional(),
  offerAmount: z.preprocess(toNum, z.number().positive('請輸入有效金額')),
  leaseTermMonths: z.preprocess(toNum, z.number().int().min(1).max(36)),
  desiredMoveIn: z.string().optional(),
  employmentStatus: z.enum(['employed', 'self_employed', 'student', 'other']).optional(),
  monthlyIncome: z.preprocess(toNum, z.number().min(0).optional()),
  occupantsCount: z.preprocess(toNum, z.number().int().min(1).max(20)),
  hasPets: z.boolean(),
  additionalNotes: z.string().max(500).optional(),
})

type FormData = z.infer<typeof schema>

const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: '受雇員工' },
  { value: 'self_employed', label: '自雇 / 創業' },
  { value: 'student', label: '學生' },
  { value: 'other', label: '其他' },
]

const LEASE_TERM_OPTIONS = [1, 3, 6, 12, 18, 24, 36]

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="bg-[#262626] border-[#333333]">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="text-[#cccccc] mb-1.5 block text-sm">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApplicationEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { showToast } = useToast()

  const [app, setApp] = useState<RentalApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      occupantsCount: 1,
      leaseTermMonths: 12,
      hasPets: false,
    },
  })

  // Load application + pre-fill user profile
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const data = await getApplicationById(id)

      if (!data) {
        showToast({ type: 'error', message: '找不到申請記錄' })
        router.push('/tenant/potential/applications')
        return
      }

      if (data.status !== 'draft') {
        // Non-draft: redirect to list
        router.push('/tenant/potential/applications')
        return
      }

      setApp(data)

      // Pre-fill from app data, fallback to current user profile
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = user
        ? await supabase
            .from('users_profile')
            .select('full_name, phone')
            .eq('id', user.id)
            .single()
        : { data: null }

      const p = profile as Record<string, unknown> | null

      reset({
        applicantName: data.applicantName || (p?.full_name as string) || '',
        applicantPhone: data.applicantPhone || (p?.phone as string) || '',
        applicantEmail: data.applicantEmail || user?.email || '',
        offerAmount: data.offerAmount,
        leaseTermMonths: data.leaseTermMonths,
        desiredMoveIn: data.desiredMoveIn?.split('T')[0] ?? '',
        employmentStatus: (data.employmentStatus as FormData['employmentStatus']) ?? undefined,
        monthlyIncome: data.monthlyIncome ?? undefined,
        occupantsCount: data.occupantsCount,
        hasPets: data.hasPets,
        additionalNotes: data.additionalNotes ?? '',
      })

      setLoading(false)
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveDraft = async (data: FormData) => {
    setSaving(true)
    const result = await updateApplicationDraft(id, {
      ...data,
      monthlyIncome: data.monthlyIncome ? Number(data.monthlyIncome) : undefined,
      applicantPhone: data.applicantPhone || undefined,
      applicantEmail: data.applicantEmail || undefined,
      desiredMoveIn: data.desiredMoveIn || undefined,
      additionalNotes: data.additionalNotes || undefined,
    })
    setSaving(false)

    if (result.success) {
      showToast({ type: 'success', message: '草稿已儲存' })
      reset(data) // reset dirty state
    } else {
      showToast({ type: 'error', message: result.error ?? '儲存失敗' })
    }
  }

  const onSubmitApplication = async (data: FormData) => {
    setSubmitting(true)

    // Save latest form data first
    await updateApplicationDraft(id, {
      ...data,
      monthlyIncome: data.monthlyIncome ? Number(data.monthlyIncome) : undefined,
      applicantPhone: data.applicantPhone || undefined,
      applicantEmail: data.applicantEmail || undefined,
      desiredMoveIn: data.desiredMoveIn || undefined,
      additionalNotes: data.additionalNotes || undefined,
    })

    const result = await submitApplication(id)
    setSubmitting(false)

    if (result.success) {
      setSubmitted(true)
      showToast({ type: 'success', message: '申請已送出', description: '等候房東審核，我們將以 Email 通知您結果' })
    } else {
      showToast({ type: 'error', message: result.error ?? '送出失敗' })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">申請已送出！</h2>
        <p className="text-[#999999]">
          房東收到後將審核您的申請，結果將以 Email 通知您。
        </p>
        <Link href="/tenant/potential/applications">
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white mt-2">
            查看所有申請
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/tenant/potential/applications"
          className="inline-flex items-center gap-1.5 text-[#999999] hover:text-white text-sm mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          返回申請列表
        </Link>
        <h1 className="text-3xl font-bold text-white">填寫租賃申請表</h1>
        <p className="text-[#999999] mt-1">填妥後送出，房東將收到通知並進行審核</p>
      </div>

      {/* Property info (read-only) */}
      {app && (
        <Card className="bg-[#1E1E1E] border-[#7C3AED]/30">
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-[#7C3AED] shrink-0" />
            <div>
              <p className="text-white font-medium">{app.propertyTitle}</p>
              <p className="text-[#999999] text-sm">{app.propertyAddress}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmitApplication)} className="space-y-5">
        {/* Offer details */}
        <Section title="租賃條件">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="出價月租金 (NT$)" required error={errors.offerAmount?.message}>
              <Input
                type="number"
                {...register('offerAmount')}
                placeholder="例：18000"
                className="bg-[#1A1A1A] border-[#333333] text-white placeholder:text-[#555555] focus:border-[#7C3AED]"
              />
            </Field>
            <Field label="租期" required error={errors.leaseTermMonths?.message}>
              <select
                {...register('leaseTermMonths')}
                className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED]"
              >
                {LEASE_TERM_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} 個月
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="預計入住日期" error={errors.desiredMoveIn?.message}>
            <Input
              type="date"
              {...register('desiredMoveIn')}
              className="bg-[#1A1A1A] border-[#333333] text-white focus:border-[#7C3AED]"
            />
          </Field>
        </Section>

        {/* Personal info */}
        <Section title="申請人基本資料">
          <Field label="姓名" required error={errors.applicantName?.message}>
            <Input
              {...register('applicantName')}
              placeholder="真實姓名"
              className="bg-[#1A1A1A] border-[#333333] text-white placeholder:text-[#555555] focus:border-[#7C3AED]"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="手機號碼" error={errors.applicantPhone?.message}>
              <Input
                {...register('applicantPhone')}
                placeholder="09xx-xxx-xxx"
                className="bg-[#1A1A1A] border-[#333333] text-white placeholder:text-[#555555] focus:border-[#7C3AED]"
              />
            </Field>
            <Field label="聯絡 Email" error={errors.applicantEmail?.message}>
              <Input
                type="email"
                {...register('applicantEmail')}
                placeholder="your@email.com"
                className="bg-[#1A1A1A] border-[#333333] text-white placeholder:text-[#555555] focus:border-[#7C3AED]"
              />
            </Field>
          </div>
        </Section>

        {/* Financial info */}
        <Section title="財務與居住狀況">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="就業狀況" error={errors.employmentStatus?.message}>
              <select
                {...register('employmentStatus')}
                className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="">請選擇</option>
                {EMPLOYMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="月收入 (NT$)" error={errors.monthlyIncome?.message}>
              <Input
                type="number"
                {...register('monthlyIncome')}
                placeholder="例：45000"
                className="bg-[#1A1A1A] border-[#333333] text-white placeholder:text-[#555555] focus:border-[#7C3AED]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="同住人數（含本人）" required error={errors.occupantsCount?.message}>
              <Input
                type="number"
                min={1}
                max={20}
                {...register('occupantsCount')}
                className="bg-[#1A1A1A] border-[#333333] text-white focus:border-[#7C3AED]"
              />
            </Field>
            <Field label="是否有寵物" error={errors.hasPets?.message}>
              <div className="flex items-center gap-4 pt-2">
                {[
                  { value: false, label: '無' },
                  { value: true, label: '有' },
                ].map(({ value, label }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={watch('hasPets') === value}
                      onChange={() => setValue('hasPets', value)}
                      className="accent-[#7C3AED]"
                    />
                    <span className="text-[#cccccc] text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        {/* Additional notes */}
        <Section title="補充說明（選填）">
          <Field label="其他說明" error={errors.additionalNotes?.message}>
            <textarea
              {...register('additionalNotes')}
              rows={4}
              placeholder="例：白天在附近上班、作息規律、無菸、期望長租..."
              className="w-full bg-[#1A1A1A] border border-[#333333] text-white placeholder:text-[#555555] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] resize-none"
            />
          </Field>
        </Section>

        {/* Notice */}
        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
          <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-blue-400 text-sm">
            送出申請後，房東將收到 Email 通知並開始審核。審核結果將通知至您的 Email。
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit(saveDraft)}
            disabled={saving || !isDirty}
            className="border-[#333333] text-[#cccccc] hover:bg-[#333333]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            儲存草稿
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-8"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            送出申請
          </Button>
        </div>
      </form>
    </div>
  )
}
