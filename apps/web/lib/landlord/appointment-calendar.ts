import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'

export type AppointmentCalendarItem = {
  id: string
  preferred_date: string
  preferred_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  visitor_name: string
  property: {
    title: string
  }
}

export function getCalendarDays(monthDate: Date): Date[] {
  const firstDay = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 })
  const lastDay = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 })

  const days: Date[] = []
  let current = firstDay

  while (current <= lastDay) {
    days.push(current)
    current = addDays(current, 1)
  }

  return days
}

export function groupAppointmentsByDate(items: AppointmentCalendarItem[]): Record<string, AppointmentCalendarItem[]> {
  return items.reduce<Record<string, AppointmentCalendarItem[]>>((acc, item) => {
    const key = format(new Date(item.preferred_date), 'yyyy-MM-dd')
    if (!acc[key]) {
      acc[key] = []
    }

    acc[key].push(item)
    acc[key].sort((a, b) => a.preferred_time.localeCompare(b.preferred_time))
    return acc
  }, {})
}
