import Link from 'next/link'
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'
import { CalendarDays, FilePlus2, Hammer, Receipt, ShoppingCart } from 'lucide-react'
import { db } from '@/db'
import { customers, estimates, invoices, leads, payments, projects } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { getProjectFinancials } from '@/lib/profit'
import { formatCents } from '@/lib/money'
import { BUSINESS_TZ, addDays, dayOfWeek, formatDate, formatDateTime, todayISO } from '@/lib/dates'
import { Card, CardHeader, EmptyState, LinkButton, PageHeader, StatCard, StatusBadge } from '@/components/ui'
import { projectScope } from './_ops/access'
import { Notice, label, mapsUrl, sp } from './_ops/ui'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('dashboard:view')
  const q = await searchParams
  const denied = sp(q.denied) === '1'

  const today = todayISO()
  const isOwner = can(user, 'job_profit:view')
  const isCrew = !can(user, 'jobs:view_all')
  const scope = projectScope(user)

  // Jobs active between today and +14 days (not finished/cancelled), limited to the user's jobs for crew.
  const horizon = addDays(today, 14)
  const upcoming = await db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      address: projects.address,
      city: projects.city,
      customerName: customers.name,
    })
    .from(projects)
    .innerJoin(customers, eq(customers.id, projects.customerId))
    .where(
      and(
        scope,
        inArray(projects.status, ['pending', 'scheduled', 'in_progress']),
        isNotNull(projects.startDate),
        lte(projects.startDate, horizon),
        or(gte(projects.endDate, today), and(isNull(projects.endDate), gte(projects.startDate, today))),
      ),
    )
    .orderBy(asc(projects.startDate))

  const isOn = (j: { startDate: string | null; endDate: string | null }, d: string) =>
    !!j.startDate && j.startDate <= d && d <= (j.endDate ?? j.startDate)
  const todays = upcoming.filter((j) => isOn(j, today))
  const weekStart = addDays(today, -dayOfWeek(today))
  const weekEnd = addDays(weekStart, 6)
  const thisWeek = upcoming.filter((j) => j.startDate! <= weekEnd && (j.endDate ?? j.startDate!) >= weekStart)

  const greeting = `Hi, ${user.name.split(' ')[0]}`

  // ---------- Crew dashboard ----------
  if (isCrew) {
    return (
      <>
        {denied ? <Notice tone="warn">You don’t have access to that page.</Notice> : null}
        <PageHeader title={greeting} description={formatDate(today)} />
        <div className="mb-6 grid grid-cols-2 gap-4">
          <StatCard label="My jobs this week" value={thisWeek.length} />
          <StatCard label="On the schedule today" value={todays.length} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <JobListCard title="Today" jobs={todays} empty="Nothing scheduled for you today." />
          <JobListCard title="Next 14 days" jobs={upcoming} empty="No upcoming jobs assigned to you." />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <LinkButton href="/admin/schedule" variant="secondary">
            <CalendarDays className="size-4" /> My schedule
          </LinkButton>
          {can(user, 'expenses:add') ? (
            <LinkButton href="/admin/expenses/new" variant="secondary">
              <ShoppingCart className="size-4" /> Add expense
            </LinkButton>
          ) : null}
        </div>
      </>
    )
  }

  // ---------- Owner / manager dashboard ----------
  const showLeads = can(user, 'leads:manage')
  const showMoney = can(user, 'invoices:manage')

  const monthStart = today.slice(0, 8) + '01'
  const yearStart = today.slice(0, 5) + '01-01'
  // payments.receivedAt is stored in UTC; convert to the business's local date before comparing.
  const localDay = sql`((${payments.receivedAt} at time zone 'UTC') at time zone ${BUSINESS_TZ})::date`

  const [newLeads, [openInv], [revenue], recentPayments, [pendingEst], completed] = await Promise.all([
    showLeads
      ? db.select().from(leads).where(eq(leads.status, 'new')).orderBy(desc(leads.createdAt)).limit(6)
      : Promise.resolve([]),
    db
      .select({
        balance: sql<number>`coalesce(sum(greatest(${invoices.totalCents} - ${invoices.paidCents}, 0)), 0)::int`,
        overdue: sql<number>`count(*) filter (where ${invoices.dueDate} < ${today})::int`,
        overdueBalance: sql<number>`coalesce(sum(greatest(${invoices.totalCents} - ${invoices.paidCents}, 0)) filter (where ${invoices.dueDate} < ${today}), 0)::int`,
      })
      .from(invoices)
      .where(inArray(invoices.status, ['sent', 'partial'])),
    isOwner
      ? db
          .select({
            month: sql<number>`coalesce(sum(${payments.amountCents}) filter (where ${localDay} >= ${monthStart}::date), 0)::int`,
            ytd: sql<number>`coalesce(sum(${payments.amountCents}) filter (where ${localDay} >= ${yearStart}::date), 0)::int`,
          })
          .from(payments)
      : Promise.resolve([{ month: 0, ytd: 0 }]),
    showMoney
      ? db
          .select({
            id: payments.id,
            amountCents: payments.amountCents,
            method: payments.method,
            receivedAt: payments.receivedAt,
            invoiceId: invoices.id,
            invoiceNumber: invoices.number,
            customerName: customers.name,
          })
          .from(payments)
          .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
          .innerJoin(customers, eq(customers.id, invoices.customerId))
          .orderBy(desc(payments.receivedAt))
          .limit(6)
      : Promise.resolve([]),
    db
      .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${estimates.totalCents}), 0)::int` })
      .from(estimates)
      .where(eq(estimates.status, 'sent')),
    isOwner
      ? db.select({ id: projects.id }).from(projects).where(eq(projects.status, 'completed'))
      : Promise.resolve([]),
  ])

  let avgMargin: number | null = null
  if (isOwner && completed.length) {
    const fin = await getProjectFinancials(completed.map((p) => p.id))
    const margins = [...fin.values()].map((f) => f.marginPct).filter((m): m is number => m != null)
    avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : null
  }

  const [activeJobs] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(projects)
    .where(inArray(projects.status, ['scheduled', 'in_progress']))
  const [newLeadCount] = showLeads
    ? await db.select({ n: sql<number>`count(*)::int` }).from(leads).where(eq(leads.status, 'new'))
    : [{ n: 0 }]

  return (
    <>
      {denied ? <Notice tone="warn">You don’t have access to that page.</Notice> : null}
      <PageHeader
        title={greeting}
        description={`Here’s what’s happening today, ${formatDate(today)}.`}
        actions={<QuickActions user={user} />}
      />

      {isOwner ? (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Collected this month" value={formatCents(revenue.month)} sub={`${formatCents(revenue.ytd)} year to date`} />
          <StatCard
            label="Outstanding"
            value={formatCents(openInv.balance)}
            sub={openInv.overdue ? `${openInv.overdue} overdue · ${formatCents(openInv.overdueBalance)}` : 'Nothing overdue'}
            tone={openInv.overdue ? 'bad' : undefined}
          />
          <StatCard
            label="Avg. job margin"
            value={avgMargin == null ? '—' : `${avgMargin.toFixed(1)}%`}
            sub={`${completed.length} completed job${completed.length === 1 ? '' : 's'}`}
            tone={avgMargin == null ? undefined : avgMargin >= 0 ? 'good' : 'bad'}
          />
          <StatCard label="Active jobs" value={activeJobs.n} sub={`${newLeadCount.n} new lead${newLeadCount.n === 1 ? '' : 's'}`} />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="New leads" value={newLeadCount.n} />
          <StatCard label="Estimates awaiting reply" value={pendingEst.n} />
          <StatCard label="Active jobs" value={activeJobs.n} />
          <StatCard label="Overdue invoices" value={openInv.overdue} tone={openInv.overdue ? 'bad' : undefined} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {showLeads ? (
          <Card>
            <CardHeader
              title="New leads"
              action={
                <Link href="/admin/leads" className="text-sm font-medium text-brand hover:underline">
                  All leads
                </Link>
              }
            />
            {newLeads.length ? (
              <ul className="divide-y divide-slate-100">
                {newLeads.map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/leads/${l.id}`} className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{l.name}</p>
                        <p className="truncate text-sm text-slate-500">
                          {l.jobType}
                          {l.city ? ` · ${l.city}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">{formatDateTime(l.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No new leads" description="New quote requests from the website show up here." />
            )}
          </Card>
        ) : null}

        <JobListCard title="Upcoming jobs (next 14 days)" jobs={upcoming} empty="Nothing on the schedule for the next two weeks." showCustomer />

        {showMoney ? (
          <Card>
            <CardHeader
              title="Recent payments"
              action={
                <Link href="/admin/invoices" className="text-sm font-medium text-brand hover:underline">
                  Invoices
                </Link>
              }
            />
            {recentPayments.length ? (
              <ul className="divide-y divide-slate-100">
                {recentPayments.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/invoices/${p.invoiceId}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{p.customerName}</p>
                        <p className="text-sm text-slate-500">
                          Invoice #{p.invoiceNumber} · {label(p.method)} · {formatDateTime(p.receivedAt)}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold text-emerald-600">{formatCents(p.amountCents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No payments yet" />
            )}
          </Card>
        ) : null}

        {can(user, 'estimates:manage') ? (
          <Card>
            <CardHeader title="Estimates awaiting reply" />
            <div className="px-5 py-4">
              <p className="text-2xl font-bold">{pendingEst.n}</p>
              <p className="text-sm text-slate-500">
                {isOwner ? `${formatCents(pendingEst.total)} in sent estimates` : 'Sent and waiting on the customer'}
              </p>
              <Link href="/admin/estimates?status=sent" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
                Review estimates →
              </Link>
            </div>
          </Card>
        ) : null}
      </div>
    </>
  )
}

function QuickActions({ user }: { user: Parameters<typeof can>[0] }) {
  return (
    <>
      {can(user, 'estimates:manage') ? (
        <LinkButton href="/admin/estimates/new" size="sm">
          <FilePlus2 className="size-4" /> New estimate
        </LinkButton>
      ) : null}
      {can(user, 'jobs:manage') ? (
        <LinkButton href="/admin/projects/new" size="sm" variant="secondary">
          <Hammer className="size-4" /> New job
        </LinkButton>
      ) : null}
      {can(user, 'expenses:add') ? (
        <LinkButton href="/admin/expenses/new" size="sm" variant="secondary">
          <ShoppingCart className="size-4" /> Add expense
        </LinkButton>
      ) : null}
      {can(user, 'invoices:manage') ? (
        <LinkButton href="/admin/invoices/new" size="sm" variant="secondary">
          <Receipt className="size-4" /> New invoice
        </LinkButton>
      ) : null}
    </>
  )
}

type JobRow = {
  id: number
  title: string
  status: string
  startDate: string | null
  endDate: string | null
  address: string | null
  city: string | null
  customerName: string
}

function JobListCard({ title, jobs, empty, showCustomer }: { title: string; jobs: JobRow[]; empty: string; showCustomer?: boolean }) {
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          <Link href="/admin/schedule" className="text-sm font-medium text-brand hover:underline">
            Schedule
          </Link>
        }
      />
      {jobs.length ? (
        <ul className="divide-y divide-slate-100">
          {jobs.map((j) => {
            const map = mapsUrl(j.address, j.city)
            return (
              <li key={j.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/admin/projects/${j.id}`} className="block truncate font-medium text-slate-900 hover:text-brand">
                    {j.title}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {formatDate(j.startDate)}
                    {j.endDate && j.endDate !== j.startDate ? ` – ${formatDate(j.endDate)}` : ''}
                    {showCustomer ? ` · ${j.customerName}` : ''}
                  </p>
                  {map ? (
                    <a href={map} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 underline-offset-2 hover:text-brand hover:underline">
                      {[j.address, j.city].filter(Boolean).join(', ')}
                    </a>
                  ) : null}
                </div>
                <StatusBadge status={j.status} />
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState title={empty} />
      )}
    </Card>
  )
}

