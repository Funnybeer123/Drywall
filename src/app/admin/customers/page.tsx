import type { Metadata } from 'next'
import Link from 'next/link'
import { asc, ilike, or, sql } from 'drizzle-orm'
import { Plus, Search } from 'lucide-react'
import { db } from '@/db'
import { customers, invoices, projects } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { formatCents } from '@/lib/money'
import { formatPhone } from '@/lib/utils'
import { Button, Card, EmptyState, Input, LinkButton, PageHeader } from '@/components/ui'
import { PhoneLink, sp } from '../_ops/ui'

export const metadata: Metadata = { title: 'Customers' }

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser('customers:manage')
  const q = (sp((await searchParams).q) ?? '').trim().slice(0, 100)

  let where
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    const digits = q.replace(/\D/g, '')
    where = or(
      ilike(customers.name, like),
      ilike(customers.email, like),
      ilike(customers.company, like),
      ilike(customers.phone, like),
      // "5550101" should match "(555) 555-0101"
      digits.length >= 3 ? sql`regexp_replace(coalesce(${customers.phone}, ''), '\\D', '', 'g') like ${`%${digits}%`}` : undefined,
    )
  }

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      company: customers.company,
      phone: customers.phone,
      email: customers.email,
      city: customers.city,
      jobs: sql<number>`(select count(*)::int from ${projects} where ${projects.customerId} = ${customers.id})`,
      balance: sql<number>`(select coalesce(sum(greatest(${invoices.totalCents} - ${invoices.paidCents}, 0)), 0)::int from ${invoices} where ${invoices.customerId} = ${customers.id} and ${invoices.status} in ('sent', 'partial'))`,
    })
    .from(customers)
    .where(where)
    .orderBy(asc(customers.name))
    .limit(500)

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${rows.length}${rows.length === 500 ? '+' : ''} ${q ? 'matching' : 'total'}`}
        actions={
          <LinkButton href="/admin/customers/new">
            <Plus className="size-4" /> New customer
          </LinkButton>
        }
      />

      <form action="/admin/customers" className="mb-4 flex gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input name="q" type="search" defaultValue={q} placeholder="Search name, phone or email" className="pl-9" aria-label="Search customers" />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title={q ? 'No customers match your search' : 'No customers yet'}
            description={q ? 'Try a different name, phone number or email.' : 'Customers are created from leads or added here.'}
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/customers/${c.id}`} className="block px-4 py-3 active:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-900">{c.name}</p>
                      {c.balance > 0 ? <span className="text-sm font-medium text-amber-700">{formatCents(c.balance)} due</span> : null}
                    </div>
                    <p className="text-sm text-slate-500">
                      {[c.company, formatPhone(c.phone), c.city].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>City</th>
                    <th className="text-right">Jobs</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/customers/${c.id}`} className="font-medium text-slate-900 hover:text-brand">
                          {c.name}
                        </Link>
                        {c.company ? <p className="text-xs text-slate-500">{c.company}</p> : null}
                      </td>
                      <td>
                        <PhoneLink phone={c.phone} />
                      </td>
                      <td className="max-w-56 truncate">
                        {c.email ? (
                          <a href={`mailto:${c.email}`} className="text-slate-700 hover:text-brand">
                            {c.email}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-slate-600">{c.city ?? '—'}</td>
                      <td className="text-right">{c.jobs}</td>
                      <td className={`text-right ${c.balance > 0 ? 'font-medium text-amber-700' : 'text-slate-400'}`}>
                        {c.balance > 0 ? formatCents(c.balance) : '—'}
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
