import nodemailer from 'nodemailer'

// ─── Transporter ──────────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '54325'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'test',
      pass: process.env.SMTP_PASS || 'test',
    },
    connectionTimeout: 5000,
  })
}

const FROM_ADDRESS =
  process.env.EMAIL_FROM || '"RESA AI 租屋平台" <noreply@resa.ai>'

// ─── Base send function ───────────────────────────────────────────────────────

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<boolean> {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? opts.html.replace(/<[^>]+>/g, ''),
    })
    return true
  } catch (error) {
    // Log but don't throw — email failure should not block the main flow
    console.error('[email] send failed:', error)
    return false
  }
}

// ─── Template helpers ─────────────────────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:8px;border:1px solid #e5e7eb">
      <div style="margin-bottom:24px">
        <span style="background:#7C3AED;color:#fff;font-weight:700;font-size:18px;padding:6px 14px;border-radius:6px">RESA AI</span>
      </div>
      <h2 style="color:#111827;font-size:20px;margin:0 0 16px">${title}</h2>
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:12px;margin:0">此信件由 RESA AI 租屋平台自動發送，請勿直接回覆。</p>
    </div>
  `
}

function row(label: string, value: string): string {
  return `<p style="margin:6px 0;color:#374151;font-size:14px"><strong>${label}：</strong>${value}</p>`
}

// ─── Specific notification emails ─────────────────────────────────────────────

/** Sent to landlord when tenant submits a rental application */
export async function sendApplicationSubmittedToLandlord(opts: {
  landlordEmail: string
  landlordName: string
  tenantName: string
  propertyAddress: string
  offerAmount: number
  leaseTermMonths: number
  desiredMoveIn?: string
  applicationId: string
}): Promise<boolean> {
  const {
    landlordEmail,
    landlordName,
    tenantName,
    propertyAddress,
    offerAmount,
    leaseTermMonths,
    desiredMoveIn,
    applicationId,
  } = opts

  const body = `
    <p style="color:#374151;margin:0 0 16px">親愛的 ${landlordName} 您好，</p>
    <p style="color:#374151;margin:0 0 16px">您有一份新的租賃申請，詳情如下：</p>
    <div style="background:#f9fafb;padding:16px;border-radius:6px;margin-bottom:16px">
      ${row('申請人', tenantName)}
      ${row('申請物件', propertyAddress)}
      ${row('出價', `NT$ ${offerAmount.toLocaleString()} / 月`)}
      ${row('租期', `${leaseTermMonths} 個月`)}
      ${desiredMoveIn ? row('預計入住', new Date(desiredMoveIn).toLocaleDateString('zh-TW')) : ''}
      ${row('申請編號', applicationId.slice(0, 8).toUpperCase())}
    </div>
    <p style="color:#374151;margin:0 0 16px">請登入平台審核此申請。</p>
  `

  return sendEmail({
    to: landlordEmail,
    subject: `[RESA AI] ${tenantName} 向您申請租賃 — ${propertyAddress}`,
    html: baseTemplate('收到新的租賃申請', body),
  })
}

/** Sent to tenant when landlord approves their application */
export async function sendApplicationApprovedToTenant(opts: {
  tenantEmail: string
  tenantName: string
  landlordName: string
  propertyAddress: string
  offerAmount: number
}): Promise<boolean> {
  const { tenantEmail, tenantName, landlordName, propertyAddress, offerAmount } = opts

  const body = `
    <p style="color:#374151;margin:0 0 16px">親愛的 ${tenantName} 您好，</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:6px;margin-bottom:16px">
      <p style="color:#166534;font-weight:600;margin:0">🎉 恭喜！您的租賃申請已通過審核</p>
    </div>
    <div style="background:#f9fafb;padding:16px;border-radius:6px;margin-bottom:16px">
      ${row('物件地址', propertyAddress)}
      ${row('月租金', `NT$ ${offerAmount.toLocaleString()} / 月`)}
      ${row('房東', landlordName)}
    </div>
    <p style="color:#374151;margin:0 0 16px">房東 ${landlordName} 將與您聯絡安排簽約事宜，請保持聯絡方式暢通。</p>
  `

  return sendEmail({
    to: tenantEmail,
    subject: `[RESA AI] 租賃申請已核准 — ${propertyAddress}`,
    html: baseTemplate('您的申請已通過！', body),
  })
}

/** Sent to tenant when landlord rejects their application */
export async function sendApplicationRejectedToTenant(opts: {
  tenantEmail: string
  tenantName: string
  propertyAddress: string
  rejectionReason?: string
}): Promise<boolean> {
  const { tenantEmail, tenantName, propertyAddress, rejectionReason } = opts

  const body = `
    <p style="color:#374151;margin:0 0 16px">親愛的 ${tenantName} 您好，</p>
    <p style="color:#374151;margin:0 0 16px">感謝您申請以下物件的租賃：</p>
    <div style="background:#f9fafb;padding:16px;border-radius:6px;margin-bottom:16px">
      ${row('申請物件', propertyAddress)}
      ${rejectionReason ? row('婉拒原因', rejectionReason) : ''}
    </div>
    <p style="color:#374151;margin:0 0 16px">很遺憾，本次申請未能通過。您可繼續瀏覽其他物件，祝您早日找到理想住所。</p>
  `

  return sendEmail({
    to: tenantEmail,
    subject: `[RESA AI] 租賃申請結果通知 — ${propertyAddress}`,
    html: baseTemplate('您的申請狀態已更新', body),
  })
}
