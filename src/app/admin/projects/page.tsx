import type { Metadata } from 'next'
import Link from 'next/link'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { Plus } from 'lucide-react'
import { db } from '@/db'
import { customers, projectAssignments, projects, users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { formatCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { Card, EmptyState, LinkButton, PageHeader, StatusBadge } from '@/components/ui'
import { projectScope } from '../_ops/access'
import { FilterTabs, PROJECT_STATUSES, label, sp } from '../_ops/ui'

export const metadata: Metadata = { title: 'Jobs' }

const ACTIVE = ['pending', 'scheduled', 'in_progress'] as const

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('jobs:view_assigned')
  const raw = sp((await searchParams).status) ?? 'active'
  const status = raw === 'all' ? 'all' : (PROJECT_STATUSES.find((s) => s === raw) ?? 'active')
  const scope = projectScope(user)
  const showMoney = can(user, 'jobs:manage')

  const statusFilter =
    status === 'all' ? undefined : status === 'active' ? inArray(projects.status, [...ACTIVE]) : eq(projects.status, status)

  const [rows, counts] = await Promise.all([
    db
      .select({
        id: projects.id,
        title: projects.title,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate,
        city: projects.city,
        quotedCents: projects.quotedCents,
        customerId: customers.id,
        customerName: customers.name,
      })
      .from(projects)
      .innerJoin(customers, eq(customers.id, projects.customerId))
      .where(and(scope, statusFilter))
      // Active work: soonest first (unscheduled last). History: newest first.
      .orderBy(
        ...(status === 'active' || status === 'pending' || status === 'scheduled' || status === 'in_progress'
          ? [sql`${projects.startDate} asc nulls last`, desc(projects.createdAt)]
          : [desc(sql`coalesce(${projects.endDate}, ${projects.startDate})`), desc(projects.createdAt)]),
      )
      .limit(300),
    db.select({ status: projects.status, n: sql<number>`count(*)::int` }).from(projects).where(scope).groupBy(projects.status),
  ])

  const crew = rows.length
    ? await db
        .select({ projectId: projectAssignments.projectId, name: users.name })
        .from(projectAssignments)
        .innerJoin(users, eq(users.id, projectAssignments.userId))
        .where(inArray(projectAssignments.projectId, rows.map((r) => r.id)))
        .orderBy(asc(users.name))
    : []
  const crewOf = (id: number) => crew.filter((c) => c.projectId === id).map((c) => c.name.split(' ')[0])

  const countOf = (s: string) =>
    s === 'all'
      ? counts.reduce((a, c) => a + c.n, 0)
      : s === 'active'
        ? counts.filter((c) => (ACTIVE as readonly string[]).includes(c.status)).reduce((a, c) => a + c.n, 0)
        : (counts.find((c) => c.status === s)?.n ?? 0)

  const dates = (r: (typeof rows)[number]) =>
    r.startDate ? `${formatDate(r.startDate)}${r.endDate && r.endDate !== r.startDate ? ` – ${formatDate(r.endDate)}` : ''}` : 'Not scheduled'

  return (
    <>
      <PageHeader
        title={showMoney ? 'Jobs' : 'My jobs'}
        actions={
          can(user, 'jobs:manage') ? (
            <LinkButton href="/admin/projects/new">
              <Plus className="size-4" /> New job
            </LinkButton>
          ) : null
        }
      />
      <FilterTabs
        tabs={['active', ...PROJECT_STATUSES, 'all'].map((s) => ({
          label: label(s),
          href: s === 'active' ? '/admin/projects' : `/admin/projects?status=${s}`,
          active: status === s,
          count: countOf(s),
        }))}
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No jobs here" description={showMoney ? 'Create a job, or convert an accepted estimate.' : 'Jobs you’re assigned to will show up here.'} />
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/projects/${r.id}`} className="block px-4 py-3 active:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-900">{r.title}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-sm text-slate-600">
                      {r.customerName}
                      {r.city ? ` · ${r.city}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      {dates(r)}
                      {crewOf(r.id).length ? ` · ${crewOf(r.id).join(', ')}` : ''}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Customer</th>
                    <th>Dates</th>
                    <th>Crew</th>
                    {showMoney ? <th className="text-right">Quoted</th> : null}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/admin/projects/${r.id}`} className="font-medium text-slate-900 hover:text-brand-fg">
                          {r.title}
                        </Link>
                        {r.city ? <p className="text-xs text-slate-500">{r.city}</p> : null}
                      </td>
                      <td>
                        {showMoney ? (
                          <Link href={`/admin/customers/${r.customerId}`} className="text-slate-700 hover:text-brand-fg">
                            {r.customerName}
                          </Link>
                        ) : (
                          r.customerName
                        )}
                      </td>
                      <td className="whitespace-nowrap text-slate-600">{dates(r)}</td>
                      <td className="text-slate-600">{crewOf(r.id).join(', ') || '—'}</td>
                      {showMoney ? <td className="text-right">{r.quotedCents ? formatCents(r.quotedCents) : '—'}</td> : null}
                      <td>
                        <StatusBadge status={r.status} />
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
