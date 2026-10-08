import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { FilePlus2, Hammer } from 'lucide-react'
import { db } from '@/db'
import { customers, estimates, invoices, leads, projects } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { balanceDue } from '@/lib/billing'
import { formatCents } from '@/lib/money'
import { formatDate, todayISO } from '@/lib/dates'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { Card, CardHeader, EmptyState, LinkButton, PageHeader, StatCard, StatusBadge } from '@/components/ui'
import { ContactLinks } from '../../_ops/ui'
import { idParam } from '../../_ops/access'
import { CustomerFields } from '../customer-fields'
import { deleteCustomer, updateCustomer } from '../actions'

export const metadata: Metadata = { title: 'Customer' }

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('customers:manage')
  const id = idParam((await params).id)
  const [c] = await db.select().from(customers).where(eq(customers.id, id))
  if (!c) notFound()

  const [jobs, ests, invs, custLeads] = await Promise.all([
    db.select().from(projects).where(eq(projects.customerId, id)).orderBy(desc(projects.createdAt)),
    db.select().from(estimates).where(eq(estimates.customerId, id)).orderBy(desc(estimates.createdAt)),
    db.select().from(invoices).where(eq(invoices.customerId, id)).orderBy(desc(invoices.issueDate)),
    db.select({ id: leads.id, jobType: leads.jobType, status: leads.status }).from(leads).where(eq(leads.customerId, id)),
  ])

  const today = todayISO()
  const billed = invs.filter((i) => i.status !== 'void' && i.status !== 'draft')
  const lifetimeBilled = billed.reduce((s, i) => s + i.totalCents, 0)
  const lifetimePaid = invs.filter((i) => i.status !== 'void').reduce((s, i) => s + Math.min(i.paidCents, i.totalCents), 0)
  const openBalance = billed.reduce((s, i) => s + balanceDue(i), 0)
  const canDelete = jobs.length + ests.length + invs.length === 0
  const showInvoices = can(user, 'invoices:manage')

  return (
    <>
      <PageHeader
        back={{ href: '/admin/customers', label: 'Customers' }}
        title={c.name}
        description={c.company ?? (c.source ? `Source: ${c.source}` : undefined)}
        actions={
          <>
            {can(user, 'estimates:manage') ? (
              <LinkButton href={`/admin/estimates/new?customerId=${c.id}`} size="sm">
                <FilePlus2 className="size-4" /> New estimate
              </LinkButton>
            ) : null}
            {can(user, 'jobs:manage') ? (
              <LinkButton href={`/admin/projects/new?customerId=${c.id}`} size="sm" variant="secondary">
                <Hammer className="size-4" /> New job
              </LinkButton>
            ) : null}
          </>
        }
      />

      <div className="mb-6">
        <ContactLinks phone={c.phone} email={c.email} address={c.address} city={[c.city, c.state].filter(Boolean).join(', ')} />
      </div>

      {showInvoices ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Lifetime value" value={formatCents(lifetimePaid)} sub="Total collected" tone={lifetimePaid > 0 ? 'good' : undefined} />
          <StatCard label="Total billed" value={formatCents(lifetimeBilled)} sub={`${billed.length} invoice${billed.length === 1 ? '' : 's'}`} />
          <StatCard label="Open balance" value={formatCents(openBalance)} tone={openBalance > 0 ? 'bad' : undefined} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader title={`Jobs (${jobs.length})`} />
            {jobs.length ? (
              <ul className="divide-y divide-slate-100">
                {jobs.map((j) => (
                  <li key={j.id}>
                    <Link href={`/admin/projects/${j.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{j.title}</p>
                        <p className="text-sm text-slate-500">
                          {j.startDate ? formatDate(j.startDate) : 'Not scheduled'}
                          {j.quotedCents ? ` · ${formatCents(j.quotedCents)} quoted` : ''}
                        </p>
                      </div>
                      <StatusBadge status={j.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No jobs yet" />
            )}
          </Card>

          <Card>
            <CardHeader title={`Estimates (${ests.length})`} />
            {ests.length ? (
              <ul className="divide-y divide-slate-100">
                {ests.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/estimates/${e.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          E-{e.id} · {e.title}
                        </p>
                        <p className="text-sm text-slate-500">{formatCents(e.totalCents)}</p>
                      </div>
                      <StatusBadge status={e.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No estimates yet" />
            )}
          </Card>

          {showInvoices ? (
            <Card>
              <CardHeader title={`Invoices (${invs.length})`} />
              {invs.length ? (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Issued</th>
                        <th className="text-right">Total</th>
                        <th className="text-right">Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invs.map((i) => {
                        const overdue = (i.status === 'sent' || i.status === 'partial') && i.dueDate < today
                        return (
                          <tr key={i.id}>
                            <td>
                              <Link href={`/admin/invoices/${i.id}`} className="font-medium hover:text-brand-fg">
                                {i.number}
                              </Link>
                            </td>
                            <td className="whitespace-nowrap">{formatDate(i.issueDate)}</td>
                            <td className="text-right">{formatCents(i.totalCents)}</td>
                            <td className="text-right">{i.status === 'void' ? '—' : formatCents(balanceDue(i))}</td>
                            <td>
                              <StatusBadge status={overdue ? 'overdue' : i.status} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No invoices yet" />
              )}
            </Card>
          ) : null}

          {custLeads.length ? (
            <Card>
              <CardHeader title="Leads" />
              <ul className="divide-y divide-slate-100">
                {custLeads.map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/leads/${l.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <span className="truncate">{l.jobType}</span>
                      <StatusBadge status={l.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Contact info" />
            <ActionForm action={updateCustomer.bind(null, c.id)} className="p-5">
              <CustomerFields c={c} />
              <div className="mt-5">
                <SubmitButton>Save changes</SubmitButton>
              </div>
            </ActionForm>
          </Card>
          {canDelete ? (
            <div className="flex justify-end">
              <ConfirmButton action={deleteCustomer} hidden={{ id: c.id }} variant="danger" confirm={`Delete ${c.name}? This can’t be undone.`}>
                Delete customer
              </ConfirmButton>
            </div>
          ) : (
            <p className="text-right text-xs text-slate-400">Customers with jobs, estimates or invoices can’t be deleted.</p>
          )}
        </div>
      </div>
    </>
  )
}
