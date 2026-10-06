import 'server-only'
import { and, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm'
import { db } from '@/db'
import { customers, expenses, invoices, laborEntries, leads, payments, projects, type ExpenseCategory } from '@/db/schema'
import { getProjectFinancials, type ProjectFinancials } from '@/lib/profit'
import { addDays, addMonths, formatDate, isValidISODate, parseISODate, startOfMonth, todayISO } from '@/lib/dates'
import { localDate } from './sql'

// ---------- Period ----------

export const PERIODS = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'ytd', label: 'Year to date' },
  { key: 'last_12', label: 'Last 12 months' },
  { key: 'custom', label: 'Custom' },
] as const
export type PeriodKey = (typeof PERIODS)[number]['key']
export type Period = { key: PeriodKey; from: string; to: string; label: string }

type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function resolvePeriod(sp: SP): Period {
  const today = todayISO()
  const from = one(sp.from)
  const to = one(sp.to)
  let key = one(sp.period) as PeriodKey | undefined
  if (isValidISODate(from) && isValidISODate(to) && (key === 'custom' || !key)) {
    const [a, b] = from <= to ? [from, to] : [to, from]
    return { key: 'custom', from: a, to: b, label: `${formatDate(a)} – ${formatDate(b)}` }
  }
  if (!PERIODS.some((p) => p.key === key) || key === 'custom') key = 'ytd'
  switch (key) {
    case 'this_month':
      return { key, from: startOfMonth(today), to: today, label: 'This month' }
    case 'last_month': {
      const start = addMonths(today, -1)
      return { key, from: start, to: addDays(startOfMonth(today), -1), label: 'Last month' }
    }
    case 'last_12':
      return { key, from: addMonths(today, -11), to: today, label: 'Last 12 months' }
    default:
      return { key: 'ytd', from: `${today.slice(0, 4)}-01-01`, to: today, label: `${today.slice(0, 4)} year to date` }
  }
}

export function periodQuery(p: Period): string {
  const q = new URLSearchParams(p.key === 'custom' ? { period: 'custom', from: p.from, to: p.to } : { period: p.key })
  return q.toString()
}

// ---------- Totals ----------

const laborCostSql = sql<number>`coalesce(sum(round(${laborEntries.hours} * ${laborEntries.rateCents})), 0)::int`

export async function getTotals(from: string, to: string) {
  const payDate = localDate(payments.receivedAt)
  const [[rev], [exp], [lab]] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
      .from(payments)
      .where(and(gte(payDate, from), lte(payDate, to))),
    db
      .select({ total: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int` })
      .from(expenses)
      .where(and(gte(expenses.date, from), lte(expenses.date, to))),
    db
      .select({ total: laborCostSql })
      .from(laborEntries)
      .where(and(gte(laborEntries.date, from), lte(laborEntries.date, to))),
  ])
  const revenueCents = rev.total
  const expenseCents = exp.total
  const laborCents = lab.total
  return { revenueCents, expenseCents, laborCents, netCents: revenueCents - expenseCents - laborCents }
}

// ---------- Monthly (last 12 months) ----------

export type MonthRow = { month: string; revenueCents: number; expenseCents: number; laborCents: number }

export async function getMonthly(): Promise<MonthRow[]> {
  const today = todayISO()
  const from = addMonths(today, -11)
  const payDate = localDate(payments.receivedAt)
  const [rev, exp, lab] = await Promise.all([
    db
      .select({ month: sql<string>`left(${payDate}, 7)`, total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
      .from(payments)
      .where(and(gte(payDate, from), lte(payDate, today)))
      .groupBy(sql`1`),
    db
      .select({ month: sql<string>`to_char(${expenses.date}, 'YYYY-MM')`, total: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int` })
      .from(expenses)
      .where(and(gte(expenses.date, from), lte(expenses.date, today)))
      .groupBy(sql`1`),
    db
      .select({ month: sql<string>`to_char(${laborEntries.date}, 'YYYY-MM')`, total: laborCostSql })
      .from(laborEntries)
      .where(and(gte(laborEntries.date, from), lte(laborEntries.date, today)))
      .groupBy(sql`1`),
  ])
  const r = new Map(rev.map((x) => [x.month, x.total]))
  const e = new Map(exp.map((x) => [x.month, x.total]))
  const l = new Map(lab.map((x) => [x.month, x.total]))
  return Array.from({ length: 12 }, (_, i) => {
    const month = addMonths(from, i).slice(0, 7)
    return { month, revenueCents: r.get(month) ?? 0, expenseCents: e.get(month) ?? 0, laborCents: l.get(month) ?? 0 }
  })
}

// ---------- Expenses by category ----------

export async function getExpensesByCategory(from: string, to: string) {
  const rows = await db
    .select({ category: expenses.category, total: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int` })
    .from(expenses)
    .where(and(gte(expenses.date, from), lte(expenses.date, to)))
    .groupBy(expenses.category)
  return rows.sort((a, b) => b.total - a.total) as { category: ExpenseCategory; total: number }[]
}

// ---------- Profit per job ----------

export const JOB_SORTS = ['profit', 'margin', 'revenue', 'recent'] as const
export type JobSort = (typeof JOB_SORTS)[number]

export type JobProfitRow = {
  id: number
  title: string
  customerId: number
  customerName: string
  status: (typeof projects.$inferSelect)['status']
  startDate: string | null
  revenueCents: number
  fin: ProjectFinancials
}

export function parseJobSort(v: string | string[] | undefined): JobSort {
  const s = one(v)
  return (JOB_SORTS as readonly string[]).includes(s ?? '') ? (s as JobSort) : 'profit'
}

/** Jobs that were active at any point during the period, with lifetime job financials. */
export async function getJobProfitRows(from: string, to: string, sort: JobSort): Promise<JobProfitRow[]> {
  const today = todayISO()
  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      completedAt: projects.completedAt,
      createdAt: projects.createdAt,
      customerId: customers.id,
      customerName: customers.name,
    })
    .from(projects)
    .innerJoin(customers, eq(customers.id, projects.customerId))
    .where(ne(projects.status, 'cancelled'))

  const active = rows.filter((p) => {
    const start = p.startDate ?? todayISO(p.createdAt)
    const end =
      p.status === 'completed'
        ? (p.completedAt ? todayISO(p.completedAt) : (p.endDate ?? start))
        : [p.endDate ?? start, today].sort()[1]
    return start <= to && end >= from
  })
  const fin = await getProjectFinancials(active.map((p) => p.id))

  const out: JobProfitRow[] = []
  for (const p of active) {
    const f = fin.get(p.id)
    if (!f) continue
    out.push({
      id: p.id,
      title: p.title,
      customerId: p.customerId,
      customerName: p.customerName,
      status: p.status,
      startDate: p.startDate,
      revenueCents: f.projected ? f.quotedCents : f.invoicedCents,
      fin: f,
    })
  }
  const by: Record<JobSort, (a: JobProfitRow, b: JobProfitRow) => number> = {
    profit: (a, b) => b.fin.profitCents - a.fin.profitCents,
    margin: (a, b) => (b.fin.marginPct ?? -Infinity) - (a.fin.marginPct ?? -Infinity),
    revenue: (a, b) => b.revenueCents - a.revenueCents,
    recent: (a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '') || b.id - a.id,
  }
  return out.sort(by[sort])
}

// ---------- Lead sources ----------

export async function getLeadSources(from: string, to: string) {
  const created = localDate(leads.createdAt)
  const rows = await db
    .select({
      source: sql<string>`coalesce(nullif(trim(${leads.source}), ''), 'Unknown')`,
      total: sql<number>`count(*)::int`,
      won: sql<number>`count(*) filter (where ${leads.status} = 'won')::int`,
      lost: sql<number>`count(*) filter (where ${leads.status} = 'lost')::int`,
    })
    .from(leads)
    .where(and(gte(created, from), lte(created, to)))
    .groupBy(sql`1`)
  return rows.sort((a, b) => b.total - a.total)
}

// ---------- Accounts receivable aging (as of today) ----------

export const AGING_BUCKETS = [
  { key: 'current', label: 'Current (not yet due)' },
  { key: 'd1_30', label: '1–30 days overdue' },
  { key: 'd31_60', label: '31–60 days overdue' },
  { key: 'd60', label: '60+ days overdue' },
] as const
export type AgingKey = (typeof AGING_BUCKETS)[number]['key']

export async function getAging() {
  const today = todayISO()
  const open = await db
    .select({ id: invoices.id, dueDate: invoices.dueDate, totalCents: invoices.totalCents, paidCents: invoices.paidCents })
    .from(invoices)
    .where(inArray(invoices.status, ['sent', 'partial']))
  const buckets: Record<AgingKey, { cents: number; count: number }> = {
    current: { cents: 0, count: 0 },
    d1_30: { cents: 0, count: 0 },
    d31_60: { cents: 0, count: 0 },
    d60: { cents: 0, count: 0 },
  }
  const todayMs = parseISODate(today).getTime()
  for (const inv of open) {
    const bal = Math.max(0, inv.totalCents - inv.paidCents)
    if (bal === 0) continue
    const daysLate = Math.round((todayMs - parseISODate(inv.dueDate).getTime()) / 86_400_000)
    const key: AgingKey = daysLate <= 0 ? 'current' : daysLate <= 30 ? 'd1_30' : daysLate <= 60 ? 'd31_60' : 'd60'
    buckets[key].cents += bal
    buckets[key].count++
  }
  return buckets
}
