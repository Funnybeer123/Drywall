import type { Metadata } from 'next'
import Link from 'next/link'
import { and, desc, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm'
import { Plus } from 'lucide-react'
import { db } from '@/db'
import { customers, invoices, payments, projects } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { balanceDue } from '@/lib/billing'
import { formatCents } from '@/lib/money'
import { formatDate, startOfMonth, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Card, EmptyState, LinkButton, PageHeader, StatCard, StatusBadge } from '@/components/ui'
import { localDate } from '../reports/sql'
import { displayStatus, INVOICE_KIND_LABELS } from './shared'

export const metadata: Metadata = { title: 'Invoices' }

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
] as const
type Tab = (typeof TABS)[number]['key']

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireUser('invoices:manage')
  const sp = await searchParams
  const tab: Tab = TABS.some((t) => t.key === sp.status) ? (sp.status as Tab) : 'all'
  const today = todayISO()
  const open = inArray(invoices.status, ['sent', 'partial'])

  const where: Record<Tab, SQL | undefined> = {
    all: undefined,
    draft: eq(invoices.status, 'draft'),
    unpaid: open,
    overdue: and(open, lt(invoices.dueDate, today)),
    paid: eq(invoices.status, 'paid'),
  }

  const balanceSum = sql<number>`coalesce(sum(greatest(${invoices.totalCents} - ${invoices.paidCents}, 0)), 0)::int`
  const [rows, [outstanding], [overdue], [collected]] = await Promise.all([
    db
      .select({
        invoice: invoices,
        customerName: customers.name,
        customerId: customers.id,
        projectTitle: projects.title,
      })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .leftJoin(projects, eq(projects.id, invoices.projectId))
      .where(where[tab])
      .orderBy(desc(invoices.number))
      .limit(500),
    db.select({ total: balanceSum, count: sql<number>`count(*)::int` }).from(invoices).where(open),
    db
      .select({ total: balanceSum, count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(open, lt(invoices.dueDate, today))),
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
      .from(payments)
      .where(gte(localDate(payments.receivedAt), startOfMonth(today))),
  ])

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Bill customers, collect payments and chase what’s overdue."
        actions={
          <LinkButton href="/admin/invoices/new">
            <Plus className="size-4" /> New invoice
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Outstanding" value={formatCents(outstanding.total)} sub={`${outstanding.count} unpaid invoice${outstanding.count === 1 ? '' : 's'}`} />
        <StatCard
          label="Overdue"
          value={formatCents(overdue.total)}
          sub={`${overdue.count} past due`}
          tone={overdue.total > 0 ? 'bad' : undefined}
        />
        <StatCard label="Collected this month" value={formatCents(collected.total)} tone={collected.total > 0 ? 'good' : undefined} />
      </div>

      <nav aria-label="Filter invoices" className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 sm:inline-flex">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'all' ? '/admin/invoices' : `/admin/invoices?status=${t.key}`}
            aria-current={tab === t.key ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap',
              tab === t.key ? 'bg-surface text-slate-900 shadow-sm dark:bg-slate-200' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title={tab === 'all' ? 'No invoices yet' : 'Nothing here'}
            description={tab === 'all' ? 'Create your first invoice from a job or estimate, or start from scratch.' : 'No invoices match this filter.'}
            action={tab === 'all' ? <LinkButton href="/admin/invoices/new">New invoice</LinkButton> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th className="hidden md:table-cell">Job</th>
                  <th className="hidden sm:table-cell">Issued</th>
                  <th>Due</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ invoice: inv, customerName, projectTitle }) => {
                  const status = displayStatus(inv, today)
                  const balance = inv.status === 'void' ? 0 : balanceDue(inv)
                  return (
                    <tr key={inv.id}>
                      <td className="font-medium">
                        <Link href={`/admin/invoices/${inv.id}`} className="text-brand-fg hover:underline">
                          {inv.number}
                        </Link>
                        {inv.kind !== 'standard' ? <span className="block text-xs text-slate-500">{INVOICE_KIND_LABELS[inv.kind]}</span> : null}
                      </td>
                      <td>
                        <Link href={`/admin/invoices/${inv.id}`} className="text-slate-900 hover:underline">
                          {customerName}
                        </Link>
                      </td>
                      <td className="hidden text-slate-600 md:table-cell">{projectTitle ?? '—'}</td>
                      <td className="hidden whitespace-nowrap text-slate-600 sm:table-cell">{formatDate(inv.issueDate)}</td>
                      <td className={cn('whitespace-nowrap', status === 'overdue' ? 'font-medium text-red-600' : 'text-slate-600')}>
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="text-right whitespace-nowrap">{formatCents(inv.totalCents)}</td>
                      <td className="text-right font-medium whitespace-nowrap">{balance > 0 ? formatCents(balance) : '—'}</td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
