import { formatCents } from '@/lib/money'
import { parseISODate } from '@/lib/dates'
import type { MonthRow } from './data'

// Validated 2-series palette (CVD-safe, ≥3:1 on white): revenue = blue-600, costs = amber-600.
const REVENUE = '#2563eb'
const COSTS = '#d97706'

const fmtShort = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
const fmtLong = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const compact = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(cents / 100)

/** Revenue vs. costs per month — CSS bars with hover/focus tooltips and a table fallback. */
export function MonthlyChart({ months }: { months: MonthRow[] }) {
  const data = months.map((m) => ({ ...m, costCents: m.expenseCents + m.laborCents, date: parseISODate(`${m.month}-01`) }))
  const max = Math.max(1, ...data.flatMap((d) => [d.revenueCents, d.costCents]))
  // Round the axis top up to a "nice" number.
  const mag = 10 ** Math.floor(Math.log10(max))
  const top = Math.ceil(max / mag) * mag
  const ticks = [top, top / 2, 0]
  const pct = (v: number) => `${(v / top) * 100}%`

  return (
    <figure>
      <figcaption className="sr-only">Revenue collected versus costs (expenses plus labor) for each of the last 12 months.</figcaption>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: REVENUE }} /> Revenue collected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: COSTS }} /> Costs (expenses + labor)
        </span>
      </div>

      <div className="flex gap-2">
        {/* y-axis */}
        <div aria-hidden className="relative hidden h-48 w-12 shrink-0 text-right text-[10px] text-slate-400 sm:block">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / top) * 100}%` }}>
              {compact(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-48">
            {ticks.map((t) => (
              <div key={t} aria-hidden className="absolute inset-x-0 border-t border-slate-100" style={{ top: `${100 - (t / top) * 100}%` }} />
            ))}
            <div className="absolute inset-0 grid grid-cols-12 gap-0.5 sm:gap-1.5">
              {data.map((d, i) => (
                <div
                  key={d.month}
                  tabIndex={0}
                  role="img"
                  aria-label={`${fmtLong.format(d.date)}: revenue ${formatCents(d.revenueCents)}, costs ${formatCents(d.costCents)}`}
                  className="group relative flex items-end justify-center gap-[2px] rounded outline-none hover:bg-slate-50 focus-visible:bg-slate-50">
                  <div className="w-full max-w-4 rounded-t-[4px]" style={{ height: pct(d.revenueCents), background: REVENUE }} />
                  <div className="w-full max-w-4 rounded-t-[4px]" style={{ height: pct(d.costCents), background: COSTS }} />
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden w-44 rounded-lg ${i < 3 ? 'left-0' : i > 8 ? 'right-0' : 'left-1/2 -translate-x-1/2'} bg-slate-900 p-2.5 text-xs text-white shadow-lg group-hover:block group-focus-visible:block`}
                  >
                    <p className="mb-1 font-semibold">{fmtLong.format(d.date)}</p>
                    <p className="flex justify-between gap-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-sm" style={{ background: REVENUE }} /> Revenue
                      </span>
                      <span className="tabular-nums">{formatCents(d.revenueCents)}</span>
                    </p>
                    <p className="flex justify-between gap-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-sm" style={{ background: COSTS }} /> Costs
                      </span>
                      <span className="tabular-nums">{formatCents(d.costCents)}</span>
                    </p>
                    <p className="mt-1 flex justify-between gap-2 border-t border-white/20 pt-1 font-semibold">
                      <span>Net</span>
                      <span className="tabular-nums">{formatCents(d.revenueCents - d.costCents)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div aria-hidden className="mt-1.5 grid grid-cols-12 gap-0.5 text-center text-[10px] text-slate-500 sm:gap-1.5">
            {data.map((d) => (
              <span key={d.month}>{fmtShort.format(d.date)}</span>
            ))}
          </div>
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-900">Show as table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Expenses</th>
                <th className="text-right">Labor</th>
                <th className="text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.month}>
                  <td>{fmtLong.format(d.date)}</td>
                  <td className="text-right tabular-nums">{formatCents(d.revenueCents)}</td>
                  <td className="text-right tabular-nums">{formatCents(d.expenseCents)}</td>
                  <td className="text-right tabular-nums">{formatCents(d.laborCents)}</td>
                  <td className="text-right font-medium tabular-nums">{formatCents(d.revenueCents - d.costCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
