import { sendEmail } from '@/lib/email'

export type AppointmentEmailStatus = 'confirmed' | 'cancelled' | 'completed'

const STATUS_LABELS: Record<AppointmentEmailStatus, string> = {
  confirmed: '已確認',
  cancelled: '已取消',
  completed: '已完成',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return isoDate
  }

  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getSubject(status: AppointmentEmailStatus, propertyTitle: string): string {
  if (status === 'confirmed') {
    return `[RESA AI] 看房預約已確認 — ${propertyTitle}`
  }

  if (status === 'cancelled') {
    return `[RESA AI] 看房預約已取消 — ${propertyTitle}`
  }

  return `[RESA AI] 看房預約已完成 — ${propertyTitle}`
}

export async function sendViewingAppointmentStatusEmail(opts: {
  tenantEmail: string
  tenantName: string
  propertyTitle: string
  propertyAddress: string
  preferredDate: string
  preferredTime: string
  status: AppointmentEmailStatus
  feedback?: string | null
}): Promise<boolean> {
  const propertyTitle = opts.propertyTitle.trim() || '房源'
  const escapedTenantName = escapeHtml(opts.tenantName.trim() || '租客')
  const escapedPropertyTitle = escapeHtml(propertyTitle)
  const escapedPropertyAddress = escapeHtml(opts.propertyAddress.trim() || '未提供地址')
  const escapedPreferredTime = escapeHtml(opts.preferredTime)
  const escapedStatus = STATUS_LABELS[opts.status]
  const escapedFeedback = opts.feedback ? escapeHtml(opts.feedback) : ''

  const feedbackBlock =
    opts.status === 'cancelled' && escapedFeedback
      ? `<p style="margin:8px 0 0;color:#374151;font-size:14px"><strong>取消原因：</strong>${escapedFeedback}</p>`
      : ''

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:8px;border:1px solid #e5e7eb">
      <div style="margin-bottom:24px">
        <span style="background:#7C3AED;color:#fff;font-weight:700;font-size:18px;padding:6px 14px;border-radius:6px">RESA AI</span>
      </div>
      <h2 style="color:#111827;font-size:20px;margin:0 0 16px">看房預約狀態更新</h2>
      <p style="margin:0 0 16px;color:#374151">親愛的 ${escapedTenantName} 您好，您的看房預約狀態已更新。</p>
      <div style="background:#f9fafb;padding:16px;border-radius:6px;margin-bottom:16px">
        <p style="margin:6px 0;color:#374151;font-size:14px"><strong>狀態：</strong>${escapedStatus}</p>
        <p style="margin:6px 0;color:#374151;font-size:14px"><strong>物件：</strong>${escapedPropertyTitle}</p>
        <p style="margin:6px 0;color:#374151;font-size:14px"><strong>地址：</strong>${escapedPropertyAddress}</p>
        <p style="margin:6px 0;color:#374151;font-size:14px"><strong>預約日期：</strong>${formatDate(opts.preferredDate)}</p>
        <p style="margin:6px 0;color:#374151;font-size:14px"><strong>預約時段：</strong>${escapedPreferredTime}</p>
        ${feedbackBlock}
      </div>
      <p style="margin:0 0 16px;color:#374151">如需調整預約，請登入平台查看最新資訊或聯繫房東。</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:12px;margin:0">此信件由 RESA AI 租屋平台自動發送，請勿直接回覆。</p>
    </div>
  `

  return sendEmail({
    to: opts.tenantEmail,
    subject: getSubject(opts.status, propertyTitle),
    html,
  })
}
