import { format, isSameMonth } from 'date-fns'
import { zhTW } from 'date-fns/locale'

import { AppointmentCalendarItem, getCalendarDays, groupAppointmentsByDate } from '@/lib/landlord/appointment-calendar'

type AppointmentCalendarProps = {
  appointments: AppointmentCalendarItem[]
  monthDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
}

const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六']

export function AppointmentCalendar({
  appointments,
  monthDate,
  onPrevMonth,
  onNextMonth,
}: AppointmentCalendarProps) {
  const days = getCalendarDays(monthDate)
  const byDate = groupAppointmentsByDate(appointments)

  return (
    <div className="rounded-xl border border-[#333333] bg-[#1A1A1A] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">看房行事曆</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevMonth}
            className="rounded-md border border-[#333333] px-3 py-1 text-sm text-[#cccccc] transition hover:bg-[#262626]"
            aria-label="上一個月"
          >
            上月
          </button>
          <p className="min-w-28 text-center text-sm font-medium text-white">
            {format(monthDate, 'yyyy 年 MM 月', { locale: zhTW })}
          </p>
          <button
            type="button"
            onClick={onNextMonth}
            className="rounded-md border border-[#333333] px-3 py-1 text-sm text-[#cccccc] transition hover:bg-[#262626]"
            aria-label="下一個月"
          >
            下月
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs text-[#999999]">
        {WEEK_HEADERS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayItems = byDate[dayKey] ?? []

          return (
            <div
              key={dayKey}
              className={`min-h-28 rounded-lg border p-2 ${
                isSameMonth(day, monthDate)
                  ? 'border-[#333333] bg-[#141414]'
                  : 'border-[#2a2a2a] bg-[#111111]'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={`text-xs ${isSameMonth(day, monthDate) ? 'text-white' : 'text-[#666666]'}`}>
                  {format(day, 'd')}
                </span>
                {dayItems.length > 0 && (
                  <span className="rounded-full bg-[#7C3AED]/20 px-2 py-0.5 text-[10px] text-[#c4b5fd]">
                    {dayItems.length} 筆
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {dayItems.slice(0, 2).map((item) => (
                  <div key={item.id} className="rounded bg-[#2a2a2a] px-1.5 py-1 text-[10px] text-[#cccccc]">
                    <p className="truncate font-medium text-white">{item.preferred_time}</p>
                    <p className="truncate">{item.property.title}</p>
                  </div>
                ))}
                {dayItems.length > 2 && (
                  <p className="text-[10px] text-[#999999]">+{dayItems.length - 2} 更多</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
