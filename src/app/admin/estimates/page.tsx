import type { Metadata } from 'next'
import Link from 'next/link'
import { desc, eq, sql } from 'drizzle-orm'
import { Plus } from 'lucide-react'
import { db } from '@/db'
import { customers, estimates } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { formatCents } from '@/lib/money'
import { formatDate, todayISO } from '@/lib/dates'
import { Card, EmptyState, LinkButton, PageHeader, StatusBadge, Badge } from '@/components/ui'
import { ESTIMATE_STATUSES, FilterTabs, label, sp } from '../_ops/ui'

export const metadata: Metadata = { title: 'Estimates' }

export default async function EstimatesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser('estimates:manage')
  const statusParam = sp((await searchParams).status)
  const status = ESTIMATE_STATUSES.find((s) => s === statusParam)

  const [rows, counts] = await Promise.all([
    db
      .select({
        id: estimates.id,
        title: estimates.title,
        status: estimates.status,
        totalCents: estimates.totalCents,
        validUntil: estimates.validUntil,
        sentAt: estimates.sentAt,
        createdAt: estimates.createdAt,
        customerId: customers.id,
        customerName: customers.name,
      })
      .from(estimates)
      .innerJoin(customers, eq(customers.id, estimates.customerId))
      .where(status ? eq(estimates.status, status) : undefined)
      .orderBy(desc(estimates.createdAt))
      .limit(300),
    db.select({ status: estimates.status, n: sql<number>`count(*)::int` }).from(estimates).groupBy(estimates.status),
  ])
  const countOf = (s?: string) => (s ? (counts.find((c) => c.status === s)?.n ?? 0) : counts.reduce((a, c) => a + c.n, 0))
  const today = todayISO()
  const expired = (r: (typeof rows)[number]) => (r.status === 'draft' || r.status === 'sent') && !!r.validUntil && r.validUntil < today

  return (
    <>
      <PageHeader
        title="Estimates"
        actions={
          <LinkButton href="/admin/estimates/new">
            <Plus className="size-4" /> New estimate
          </LinkButton>
        }
      />
      <FilterTabs
        tabs={[
          { label: 'All', href: '/admin/estimates', active: !status, count: countOf() },
          ...ESTIMATE_STATUSES.map((s) => ({ label: label(s), href: `/admin/estimates?status=${s}`, active: status === s, count: countOf(s) })),
        ]}
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No estimates here"
            action={
              <LinkButton href="/admin/estimates/new" size="sm">
                Create an estimate
              </LinkButton>
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/estimates/${r.id}`} className="block px-4 py-3 active:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-900">{r.title}</p>
                      <span className="font-semibold">{formatCents(r.totalCents)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-slate-500">
                        E-{r.id} · {r.customerName}
                      </p>
                      <span className="flex gap-1">
                        {expired(r) ? <Badge tone="red">Expired</Badge> : null}
                        <StatusBadge status={r.status} />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Valid until</th>
                    <th className="text-right">Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="text-slate-500">E-{r.id}</td>
                      <td>
                        <Link href={`/admin/estimates/${r.id}`} className="font-medium text-slate-900 hover:text-brand-fg">
                          {r.title}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/admin/customers/${r.customerId}`} className="text-slate-700 hover:text-brand-fg">
                          {r.customerName}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-slate-600">{formatDate(todayISO(r.sentAt ?? r.createdAt))}</td>
                      <td className="whitespace-nowrap text-slate-600">{formatDate(r.validUntil)}</td>
                      <td className="text-right font-medium">{formatCents(r.totalCents)}</td>
                      <td>
                        <span className="flex gap-1">
                          <StatusBadge status={r.status} />
                          {expired(r) ? <Badge tone="red">Expired</Badge> : null}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </>
  )
}
