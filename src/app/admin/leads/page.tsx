import type { Metadata } from 'next'
import Link from 'next/link'
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { leads } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { formatDateTime } from '@/lib/dates'
import { formatPhone } from '@/lib/utils'
import { Button, Card, EmptyState, PageHeader, Select, StatusBadge } from '@/components/ui'
import { FilterTabs, LEAD_STATUSES, PhoneLink, label, sp } from '../_ops/ui'

export const metadata: Metadata = { title: 'Leads' }

type Search = Promise<Record<string, string | string[] | undefined>>

export default async function LeadsPage({ searchParams }: { searchParams: Search }) {
  await requireUser('leads:manage')
  const q = await searchParams
  const statusParam = sp(q.status)
  const status = LEAD_STATUSES.find((s) => s === statusParam)
  const source = sp(q.source) || undefined

  const [rows, counts, sources] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(and(status ? eq(leads.status, status) : undefined, source ? eq(leads.source, source) : undefined))
      .orderBy(desc(leads.createdAt))
      .limit(300),
    db
      .select({ status: leads.status, n: sql<number>`count(*)::int` })
      .from(leads)
      .where(source ? eq(leads.source, source) : undefined)
      .groupBy(leads.status),
    db.selectDistinct({ source: leads.source }).from(leads).where(isNotNull(leads.source)).orderBy(leads.source),
  ])
  const countOf = (s?: string) => (s ? (counts.find((c) => c.status === s)?.n ?? 0) : counts.reduce((a, c) => a + c.n, 0))

  const href = (s?: string) => {
    const p = new URLSearchParams()
    if (s) p.set('status', s)
    if (source) p.set('source', source)
    const qs = p.toString()
    return `/admin/leads${qs ? `?${qs}` : ''}`
  }

  return (
    <>
      <PageHeader title="Leads" description="Quote requests from your website and other sources." />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <FilterTabs
          tabs={[
            { label: 'All', href: href(), active: !status, count: countOf() },
            ...LEAD_STATUSES.map((s) => ({ label: label(s), href: href(s), active: status === s, count: countOf(s) })),
          ]}
        />
        {sources.length ? (
          <form className="mb-4 flex items-center gap-2" action="/admin/leads">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <Select name="source" defaultValue={source ?? ''} aria-label="Filter by source" className="h-9 w-44">
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s.source} value={s.source!}>
                  {s.source}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" size="sm">
              Filter
            </Button>
          </form>
        ) : null}
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No leads here" description="New quote requests from the website will show up automatically." />
        ) : (
          <>
            {/* Phone: stacked cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((l) => (
                <li key={l.id}>
                  <Link href={`/admin/leads/${l.id}`} className="block px-4 py-3 active:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-900">{l.name}</p>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="text-sm text-slate-600">
                      {l.jobType}
                      {l.city ? ` · ${l.city}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatPhone(l.phone)} · {formatDateTime(l.createdAt)}
                      {l.source ? ` · ${l.source}` : ''}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Job</th>
                    <th>Phone</th>
                    <th>Source</th>
                    <th>Received</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link href={`/admin/leads/${l.id}`} className="font-medium text-slate-900 hover:text-brand">
                          {l.name}
                        </Link>
                        {l.city ? <p className="text-xs text-slate-500">{l.city}</p> : null}
                      </td>
                      <td>
                        {l.jobType}
                        {l.photoUrls.length ? <span className="ml-1 text-xs text-slate-400">· {l.photoUrls.length} photo{l.photoUrls.length === 1 ? '' : 's'}</span> : null}
                      </td>
                      <td>
                        <PhoneLink phone={l.phone} />
                      </td>
                      <td className="text-slate-600">{l.source ?? '—'}</td>
                      <td className="whitespace-nowrap text-slate-600">{formatDateTime(l.createdAt)}</td>
                      <td>
                        <StatusBadge status={l.status} />
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
