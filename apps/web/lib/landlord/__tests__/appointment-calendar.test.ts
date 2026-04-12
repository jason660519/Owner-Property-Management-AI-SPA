import { groupAppointmentsByDate, getCalendarDays } from '@/lib/landlord/appointment-calendar'

describe('appointment-calendar helpers', () => {
  it('returns calendar day range for full month grid', () => {
    const days = getCalendarDays(new Date('2026-04-01T00:00:00Z'))

    expect(days.length).toBe(35)
    expect(days[0].toISOString().slice(0, 10)).toBe('2026-03-29')
    expect(days[days.length - 1].toISOString().slice(0, 10)).toBe('2026-05-02')
  })

  it('groups and sorts appointments by date', () => {
    const grouped = groupAppointmentsByDate([
      {
        id: 'a2',
        preferred_date: '2026-04-20',
        preferred_time: '15:30',
        status: 'pending',
        visitor_name: 'A',
        property: { title: 'A' },
      },
      {
        id: 'a1',
        preferred_date: '2026-04-20',
        preferred_time: '09:00',
        status: 'confirmed',
        visitor_name: 'B',
        property: { title: 'B' },
      },
    ])

    expect(grouped['2026-04-20']).toHaveLength(2)
    expect(grouped['2026-04-20'][0].id).toBe('a1')
    expect(grouped['2026-04-20'][1].id).toBe('a2')
  })
})
