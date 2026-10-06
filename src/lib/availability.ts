import { addDays, dayOfWeek } from './dates'

export type DayStatus = 'open' | 'limited' | 'booked' | 'closed'

export type AvailabilityInput = {
  from: string // YYYY-MM-DD
  days: number
  capacity: number // how many jobs the company can run at once
  workDays: number[] // 0 = Sunday … 6 = Saturday
  jobs: { startDate: string | null; endDate: string | null; status: string }[]
  blocks: { startDate: string; endDate: string; userId: number | null }[]
}

const ACTIVE_JOB = new Set(['scheduled', 'in_progress'])

/**
 * Public availability, with no customer details:
 * - closed: not a work day
 * - booked: company-wide blackout, or every crew slot is taken
 * - limited: some crews busy, at least one slot open
 * - open: nothing scheduled
 */
export function computeAvailability(input: AvailabilityInput): { date: string; status: DayStatus }[] {
  const capacity = Math.max(1, input.capacity)
  const jobs = input.jobs.filter((j) => j.startDate && ACTIVE_JOB.has(j.status))
  const companyBlocks = input.blocks.filter((b) => b.userId == null)

  const out: { date: string; status: DayStatus }[] = []
  for (let i = 0; i < input.days; i++) {
    const date = addDays(input.from, i)
    if (!input.workDays.includes(dayOfWeek(date))) {
      out.push({ date, status: 'closed' })
      continue
    }
    if (companyBlocks.some((b) => b.startDate <= date && date <= b.endDate)) {
      out.push({ date, status: 'booked' })
      continue
    }
    const busy = jobs.filter((j) => j.startDate! <= date && date <= (j.endDate ?? j.startDate!)).length
    const status: DayStatus = busy === 0 ? 'open' : busy >= capacity ? 'booked' : 'limited'
    out.push({ date, status })
  }
  return out
}

export function parseWorkDays(s: string): number[] {
  return s
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
}

/** First date with an open or limited slot — shown as "Next available" on the site. */
export function nextAvailable(days: { date: string; status: DayStatus }[]): string | null {
  return days.find((d) => d.status === 'open' || d.status === 'limited')?.date ?? null
}
