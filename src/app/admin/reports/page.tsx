import type { Metadata } from 'next'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { formatCents } from '@/lib/money'
import { EXPENSE_CATEGORY_LABELS } from '@/lib/expense-categories'
import { cn } from '@/lib/utils'
import { Badge, buttonClass, Card, CardHeader, EmptyState, Field, Input, PageHeader, StatCard, StatusBadge } from '@/components/ui'
import {
  AGING_BUCKETS,
  getAging,
  getExpensesByCategory,
  getJobProfitRows,
  getLeadSources,
  getMonthly,
  getTotals,
  parseJobSort,
  PERIODS,
  periodQuery,
  resolvePeriod,
  type JobSort,
} from './data'
import { MonthlyChart } from './monthly-chart'

export const metadata: Metadata = { title: 'Reports' }

const pctFmt = (n: number | null) => (n == null ? '—' : `${n.toFixed(0)}%`)

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser('reports:view')
  const sp = await searchParams
  const period = resolvePeriod(sp)
  const sort = parseJobSort(sp.sort)
  const pq = periodQuery(period)

  const [totals, monthly, byCategory, jobs, sources, aging] = await Promise.all([
    getTotals(period.from, period.to),
    getMonthly(),
    getExpensesByCategory(period.from, period.to),
    getJobProfitRows(period.from, period.to, sort),
    getLeadSources(period.from, period.to),
    getAging(),
  ])

  const maxCat = byCategory[0]?.total ?? 0
  const catTotal = byCategory.reduce((s, c) => s + c.total, 0)
  const leadTotal = sources.reduce((s, r) => s + r.total, 0)
  const wonTotal = sources.reduce((s, r) => s + r.won, 0)
  const arTotal = Object.values(aging).reduce((s, b) => s + b.cents, 0)
  const margin = totals.revenueCents > 0 ? (totals.netCents / totals.revenueCents) * 100 : null

  const sortLink = (s: JobSort, label: string) => (
    <Link
      href={`/admin/reports?${pq}&sort=${s}#jobs`}
      className={cn('hover:text-slate-900', sort === s ? 'text-slate-900 underline underline-offset-4' : '')}
      aria-current={sort === s ? 'true' : undefined}
    >
      {label}
      {sort === s ? ' ↓' : ''}
    </Link>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description={`How the business is doing — ${period.label}.`} />

      {/* Period selector */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <nav aria-label="Report period" className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            {PERIODS.filter((p) => p.key !== 'custom').map((p) => (
              <Link
                key={p.key}
                href={`/admin/reports?period=${p.key}`}
                aria-current={period.key === p.key ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap',
                  period.key === p.key ? 'bg-surface text-slate-900 shadow-sm dark:bg-slate-200' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {p.label}
              </Link>
            ))}
          </nav>
          <form method="get" action="/admin/reports" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="period" value="custom" />
            <Field label="From" htmlFor="r-from">
              <Input id="r-from" name="from" type="date" required defaultValue={period.from} className="w-40" />
            </Field>
            <Field label="To" htmlFor="r-to">
              <Input id="r-to" name="to" type="date" required defaultValue={period.to} className="w-40" />
            </Field>
            <button type="submit" className={buttonClass(period.key === 'custom' ? 'dark' : 'secondary')}>
              Apply
            </button>
          </form>
        </div>
      </Card>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue collected" value={formatCents(totals.revenueCents)} sub="Payments received" />
        <StatCard label="Expenses" value={formatCents(totals.expenseCents)} sub="Materials & overhead" />
        <StatCard label="Labor" value={formatCents(totals.laborCents)} sub="Logged crew hours" />
        <StatCard
          label="Net profit"
          value={formatCents(totals.netCents)}
          sub={margin == null ? 'No revenue yet' : `${margin.toFixed(0)}% of revenue`}
          tone={totals.netCents > 0 ? 'good' : totals.netCents < 0 ? 'bad' : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader title="Last 12 months" description="Cash in vs. costs out, by month" />
          <div className="p-5">
            <MonthlyChart months={monthly} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Expenses by category" description={period.label} />
          {byCategory.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">No expenses logged in this period.</p>
          ) : (
            <ul className="space-y-3 p-5">
              {byCategory.map((c) => (
                <li key={c.category}>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-slate-700">{EXPENSE_CATEGORY_LABELS[c.category]}</span>
                    <span className="font-medium tabular-nums">
                      {formatCents(c.total)}
                      <span className="ml-1.5 text-xs font-normal text-slate-400">{catTotal ? Math.round((c.total / catTotal) * 100) : 0}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden>
                    <div className="h-full rounded-full bg-[#d97706]" style={{ width: `${Math.max(2, (c.total / maxCat) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Profit per job */}
      <Card id="jobs">
        <CardHeader
          title="Profit per job"
          description="Jobs active during this period (lifetime numbers per job). “Est.” = no invoices yet, so the quote is used."
          action={
            <a href={`/admin/reports/export?${pq}&sort=${sort}`} className={buttonClass('secondary', 'sm')}>
              <Download className="size-4" /> CSV
            </a>
          }
        />
        {jobs.length === 0 ? (
          <EmptyState title="No jobs in this period" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Job</th>
                  <th className="hidden sm:table-cell">Status</th>
                  <th className="text-right">{sortLink('revenue', 'Revenue')}</th>
                  <th className="hidden text-right md:table-cell">Materials</th>
                  <th className="hidden text-right md:table-cell">Labor</th>
                  <th className="text-right">{sortLink('profit', 'Profit')}</th>
                  <th className="text-right">{sortLink('margin', 'Margin')}</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <Link href={`/admin/projects/${j.id}`} className="font-medium text-slate-900 hover:underline">
                        {j.title}
                      </Link>
                      <Link href={`/admin/customers/${j.customerId}`} className="block text-xs text-slate-500 hover:underline">
                        {j.customerName}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="text-right whitespace-nowrap tabular-nums">
                      {formatCents(j.revenueCents)}
                      {j.fin.projected ? (
                        <Badge tone="yellow" className="ml-1.5">
                          Est.
                        </Badge>
                      ) : null}
                    </td>
                    <td className="hidden text-right whitespace-nowrap tabular-nums md:table-cell">{formatCents(j.fin.expenseCents)}</td>
                    <td className="hidden text-right whitespace-nowrap tabular-nums md:table-cell">{formatCents(j.fin.laborCents)}</td>
                    <td
                      className={cn(
                        'text-right font-semibold whitespace-nowrap tabular-nums',
                        j.fin.profitCents < 0 ? 'text-red-600' : 'text-slate-900',
                      )}
                    >
                      {formatCents(j.fin.profitCents)}
                    </td>
                    <td className={cn('text-right tabular-nums', j.fin.marginPct != null && j.fin.marginPct < 20 ? 'text-amber-700' : '')}>
                      {pctFmt(j.fin.marginPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Sort by {sortLink('profit', 'profit')} · {sortLink('margin', 'margin')} · {sortLink('revenue', 'revenue')} · {sortLink('recent', 'most recent')}
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead sources */}
        <Card>
          <CardHeader
            title="Lead sources & conversion"
            description={leadTotal ? `${leadTotal} leads · ${wonTotal} won (${Math.round((wonTotal / leadTotal) * 100)}%)` : period.label}
          />
          {sources.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">No leads came in during this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th className="text-right">Leads</th>
                    <th className="text-right">Won</th>
                    <th className="text-right">Win rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.source}>
                      <td className="font-medium text-slate-900">{s.source}</td>
                      <td className="text-right tabular-nums">{s.total}</td>
                      <td className="text-right tabular-nums">{s.won}</td>
                      <td className="text-right tabular-nums">{pctFmt(s.total ? (s.won / s.total) * 100 : null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* A/R aging */}
        <Card>
          <CardHeader
            title="Accounts receivable aging"
            description={`${formatCents(arTotal)} owed to you right now`}
            action={
              <Link href="/admin/invoices?status=unpaid" className="text-sm text-brand-fg hover:underline">
                Unpaid invoices
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100">
            {AGING_BUCKETS.map((b) => {
              const v = aging[b.key]
              const late = b.key !== 'current'
              return (
                <li key={b.key} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="text-slate-700">
                    {b.label}
                    <span className="ml-2 text-xs text-slate-400">
                      {v.count} invoice{v.count === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className={cn('font-semibold tabular-nums', late && v.cents > 0 ? (b.key === 'd60' ? 'text-red-600' : 'text-amber-700') : 'text-slate-900')}>
                    {formatCents(v.cents)}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </div>
  )
}
