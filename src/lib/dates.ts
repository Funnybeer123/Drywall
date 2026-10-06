// Dates for jobs/invoices are stored as plain 'YYYY-MM-DD' strings so time zones never shift them.

export const BUSINESS_TZ = process.env.BUSINESS_TIMEZONE || 'America/Chicago'

/** Today's date in the business's time zone, as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toISODate(d)
}

export function dayOfWeek(iso: string): number {
  return parseISODate(iso).getUTCDay()
}

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + '01'
}

export function addMonths(iso: string, months: number): string {
  const d = parseISODate(startOfMonth(iso))
  d.setUTCMonth(d.getUTCMonth() + months)
  return toISODate(d)
}

export function daysInMonth(iso: string): number {
  const d = parseISODate(startOfMonth(iso))
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
}

export function isValidISODate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISODate(s).getTime())
}

const fmtDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const fmtMonth = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return fmtDate.format(parseISODate(iso))
}

export function formatMonth(iso: string): string {
  return fmtMonth.format(parseISODate(iso))
}

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: BUSINESS_TZ,
  }).format(d)
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd
}
