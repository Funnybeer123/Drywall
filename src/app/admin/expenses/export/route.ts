import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { appUrl } from '@/lib/settings'
import { expenseCategoryLabel } from '@/lib/expense-categories'
import { toCsv } from '@/app/admin/reports/csv'
import { parseExpenseFilters, queryExpenses } from '../queries'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  if (!can(user, 'expenses:add')) return new Response('Forbidden', { status: 403 })

  const f = parseExpenseFilters(Object.fromEntries(req.nextUrl.searchParams))
  const rows = await queryExpenses(f, user) // employees only get their own

  const csv = toCsv(
    ['Date', 'Category', 'Vendor', 'Description', 'Job', 'Amount', 'Receipt URL'],
    rows.map(({ expense: e, projectTitle }) => [
      e.date,
      expenseCategoryLabel(e.category),
      e.vendor ?? '',
      e.description ?? '',
      projectTitle ?? 'Overhead',
      (e.amountCents / 100).toFixed(2),
      e.receiptUrl ? (e.receiptUrl.startsWith('http') ? e.receiptUrl : appUrl(e.receiptUrl)) : '',
    ]),
  )

  const name = `expenses-${f.month ?? 'all'}${f.category ? `-${f.category}` : ''}${f.overhead ? '-overhead' : ''}.csv`
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
