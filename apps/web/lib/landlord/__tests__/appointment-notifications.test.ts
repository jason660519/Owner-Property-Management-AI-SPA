import { sendEmail } from '@/lib/email'
import { sendViewingAppointmentStatusEmail } from '@/lib/landlord/appointment-notifications'

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}))

describe('sendViewingAppointmentStatusEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends confirmation email with expected subject and tenant name', async () => {
    ;(sendEmail as jest.Mock).mockResolvedValue(true)

    const result = await sendViewingAppointmentStatusEmail({
      tenantEmail: 'tenant@example.com',
      tenantName: '王小明',
      propertyTitle: '信義區兩房',
      propertyAddress: '台北市信義區松仁路 1 號',
      preferredDate: '2026-04-20',
      preferredTime: '14:00',
      status: 'confirmed',
    })

    expect(result).toBe(true)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'tenant@example.com',
        subject: '[RESA AI] 看房預約已確認 — 信義區兩房',
        html: expect.stringContaining('王小明'),
      })
    )
  })

  it('includes cancellation feedback in email body', async () => {
    ;(sendEmail as jest.Mock).mockResolvedValue(true)

    await sendViewingAppointmentStatusEmail({
      tenantEmail: 'tenant@example.com',
      tenantName: '王小明',
      propertyTitle: '信義區兩房',
      propertyAddress: '台北市信義區松仁路 1 號',
      preferredDate: '2026-04-20',
      preferredTime: '14:00',
      status: 'cancelled',
      feedback: '臨時有行程衝突',
    })

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: '[RESA AI] 看房預約已取消 — 信義區兩房',
        html: expect.stringContaining('臨時有行程衝突'),
      })
    )
  })
})
