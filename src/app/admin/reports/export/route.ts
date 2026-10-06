import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { toCsv } from '../csv'
import { getJobProfitRows, parseJobSort, resolvePeriod } from '../data'

const dollars = (cents: number) => (cents / 100).toFixed(2)

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  if (!can(user, 'reports:view')) return new Response('Forbidden', { status: 403 })

  const sp = Object.fromEntries(req.nextUrl.searchParams)
  const period = resolvePeriod(sp)
  const rows = await getJobProfitRows(period.from, period.to, parseJobSort(sp.sort))

  const csv = toCsv(
    ['Job', 'Customer', 'Status', 'Start date', 'Quoted', 'Invoiced (pre-tax)', 'Collected', 'Revenue used', 'Revenue basis', 'Materials & expenses', 'Labor', 'Profit', 'Margin %'],
    rows.map((j) => [
      j.title,
      j.customerName,
      j.status,
      j.startDate ?? '',
      dollars(j.fin.quotedCents),
      dollars(j.fin.invoicedCents),
      dollars(j.fin.collectedCents),
      dollars(j.revenueCents),
      j.fin.projected ? 'Quote (not yet invoiced)' : 'Invoiced',
      dollars(j.fin.expenseCents),
      dollars(j.fin.laborCents),
      dollars(j.fin.profitCents),
      j.fin.marginPct == null ? '' : j.fin.marginPct.toFixed(1),
    ]),
  )

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="job-profit-${period.from}-to-${period.to}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
