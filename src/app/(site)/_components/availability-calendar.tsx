import type { DayStatus } from '@/lib/availability'
import { addMonths, daysInMonth, dayOfWeek, formatDate, formatMonth } from '@/lib/dates'
import { cn } from '@/lib/utils'

export const STATUS_META: Record<DayStatus, { label: string; cell: string; dot: string; description: string }> = {
  open: {
    label: 'Open',
    cell: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    dot: 'bg-emerald-500',
    description: 'Available to start',
  },
  limited: {
    label: 'Limited',
    cell: 'bg-amber-50 text-amber-800 ring-amber-200',
    dot: 'bg-amber-400',
    description: 'Some crews booked',
  },
  booked: {
    label: 'Booked',
    cell: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
    description: 'Fully booked',
  },
  closed: {
    label: 'Closed',
    cell: 'bg-slate-50 text-slate-400 ring-slate-100',
    dot: 'bg-slate-300',
    description: 'Not a work day',
  },
}

export function AvailabilityLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600', className)}>
      {(Object.keys(STATUS_META) as DayStatus[]).map((k) => (
        <li key={k} className="inline-flex items-center gap-2">
          <span className={cn('size-3 rounded-full', STATUS_META[k].dot)} aria-hidden="true" />
          <span className="font-medium text-slate-900">{STATUS_META[k].label}</span>
          <span className="hidden sm:inline">— {STATUS_META[k].description}</span>
        </li>
      ))}
    </ul>
  )
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** One month grid. Days before `today` render muted; days outside the computed range are blank. */
export function MonthGrid({
  month,
  statuses,
  today,
}: {
  month: string // any YYYY-MM-DD in the month
  statuses: Map<string, DayStatus>
  today: string
}) {
  const first = month.slice(0, 8) + '01'
  const lead = dayOfWeek(first)
  const count = daysInMonth(first)
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => first.slice(0, 8) + String(i + 1).padStart(2, '0')),
  ]

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <h3 className="mb-4 text-base font-semibold text-slate-900">{formatMonth(first)}</h3>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAYS.map((short, i) => (
          <div key={i} aria-hidden="true" className="pb-1 text-center text-xs font-medium text-slate-400">
            {short}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`b${i}`} aria-hidden="true" />
          const day = Number(date.slice(8))
          const past = date < today
          const status = statuses.get(date)
          const meta = status ? STATUS_META[status] : null
          const isToday = date === today
          return (
            <div
              key={date}
              title={past ? undefined : meta?.label}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-medium ring-1 ring-inset',
                past || !meta ? 'text-slate-300 ring-transparent' : meta.cell,
                isToday && 'outline-2 outline-offset-1 outline-slate-900',
              )}
            >
              <span aria-hidden="true">{day}</span>
              {!past && meta && status !== 'closed' ? (
                <span className={cn('mt-0.5 size-1.5 rounded-full', meta.dot)} aria-hidden="true" />
              ) : null}
              <span className="sr-only">
                {formatDate(date)}
                {isToday ? ' (today)' : ''}: {past ? 'past' : (meta?.label ?? 'unknown')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function monthsFrom(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMonths(today, i))
}
