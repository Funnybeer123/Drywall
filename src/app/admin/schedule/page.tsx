import type { Metadata } from 'next'
import Link from 'next/link'
import { and, asc, eq, gte, isNotNull, isNull, lte, ne, sql } from 'drizzle-orm'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { db } from '@/db'
import { customers, projects, scheduleBlocks, users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { addDays, addMonths, dayOfWeek, daysInMonth, formatDate, formatMonth, parseISODate, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { Card, CardHeader, Field, Input, LinkButton, PageHeader, Select, StatusBadge, buttonClass } from '@/components/ui'
import { projectScope } from '../_ops/access'
import { BLOCK_COLOR, BLOCK_KINDS, jobColor, label, sp } from '../_ops/ui'
import { addBlock, deleteBlock } from './actions'

export const metadata: Metadata = { title: 'Schedule' }

type Ev = {
  key: string
  title: string
  sub?: string
  start: string
  end: string
  href?: string
  color: string
  kind: 'job' | 'block'
  status?: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const diffDays = (a: string, b: string) => Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000)

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('schedule:view')
  const q = await searchParams
  const today = todayISO()
  const monthParam = sp(q.month)
  const monthStart = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? `${monthParam}-01` : today.slice(0, 8) + '01'
  const monthEnd = addDays(monthStart, daysInMonth(monthStart) - 1)
  const gridStart = addDays(monthStart, -dayOfWeek(monthStart))
  const gridEnd = addDays(monthEnd, 6 - dayOfWeek(monthEnd))
  const listView = sp(q.view) === 'list'
  const manage = can(user, 'schedule:manage')

  const [jobs, blocks, team, unscheduled] = await Promise.all([
    db
      .select({
        id: projects.id,
        title: projects.title,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate,
        city: projects.city,
        customerName: customers.name,
      })
      .from(projects)
      .innerJoin(customers, eq(customers.id, projects.customerId))
      .where(
        and(
          projectScope(user),
          ne(projects.status, 'cancelled'),
          isNotNull(projects.startDate),
          lte(projects.startDate, gridEnd),
          gte(sql`coalesce(${projects.endDate}, ${projects.startDate})`, gridStart),
        ),
      )
      .orderBy(asc(projects.startDate)),
    db
      .select({
        id: scheduleBlocks.id,
        title: scheduleBlocks.title,
        kind: scheduleBlocks.kind,
        startDate: scheduleBlocks.startDate,
        endDate: scheduleBlocks.endDate,
        note: scheduleBlocks.note,
        userId: scheduleBlocks.userId,
        userName: users.name,
      })
      .from(scheduleBlocks)
      .leftJoin(users, eq(users.id, scheduleBlocks.userId))
      .where(and(lte(scheduleBlocks.startDate, gridEnd), gte(scheduleBlocks.endDate, gridStart)))
      .orderBy(asc(scheduleBlocks.startDate)),
    manage ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.active, true)).orderBy(asc(users.name)) : Promise.resolve([]),
    can(user, 'jobs:manage')
      ? db
          .select({ id: projects.id, title: projects.title, status: projects.status, customerName: customers.name })
          .from(projects)
          .innerJoin(customers, eq(customers.id, projects.customerId))
          .where(and(isNull(projects.startDate), eq(projects.status, 'pending')))
          .orderBy(asc(projects.createdAt))
      : Promise.resolve([]),
  ])

  const events: Ev[] = [
    ...blocks.map((b) => ({
      key: `b${b.id}`,
      title: b.userName ? `${b.userName.split(' ')[0]}: ${b.title}` : b.title,
      sub: `${label(b.kind)}${b.userName ? '' : ' · whole company'}`,
      start: b.startDate,
      end: b.endDate,
      color: BLOCK_COLOR,
      kind: 'block' as const,
    })),
    ...jobs.map((j) => ({
      key: `j${j.id}`,
      title: j.title,
      sub: [j.customerName, j.city].filter(Boolean).join(' · '),
      start: j.startDate!,
      end: j.endDate ?? j.startDate!,
      href: `/admin/projects/${j.id}`,
      color: j.status === 'completed' ? 'bg-slate-100 text-slate-500 ring-slate-200 line-through decoration-slate-300' : jobColor(j.id),
      kind: 'job' as const,
      status: j.status,
    })),
  ]

  // Build week rows with events packed into lanes so multi-day jobs render as bars.
  const weeks: { days: string[]; items: { ev: Ev; col: number; span: number; lane: number; contL: boolean; contR: boolean }[]; lanes: number }[] = []
  for (let ws = gridStart; ws <= gridEnd; ws = addDays(ws, 7)) {
    const we = addDays(ws, 6)
    const inWeek = events
      .filter((e) => e.start <= we && e.end >= ws)
      .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : diffDays(b.start, b.end) - diffDays(a.start, a.end)))
    const laneEnds: string[] = []
    const items = inWeek.map((ev) => {
      const s = ev.start < ws ? ws : ev.start
      const e = ev.end > we ? we : ev.end
      let lane = laneEnds.findIndex((end) => end < s)
      if (lane === -1) lane = laneEnds.length
      laneEnds[lane] = e
      return { ev, col: diffDays(ws, s) + 1, span: diffDays(s, e) + 1, lane, contL: ev.start < ws, contR: ev.end > we }
    })
    weeks.push({ days: Array.from({ length: 7 }, (_, i) => addDays(ws, i)), items, lanes: laneEnds.length })
  }

  const monthKey = monthStart.slice(0, 7)
  const prev = addMonths(monthStart, -1).slice(0, 7)
  const next = addMonths(monthStart, 1).slice(0, 7)
  const qs = (m: string, v = listView) => `/admin/schedule?month=${m}${v ? '&view=list' : ''}`
  const monthEvents = events
    .filter((e) => e.start <= monthEnd && e.end >= monthStart)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
  const monthBlocks = blocks.filter((b) => b.startDate <= monthEnd && b.endDate >= monthStart)

  return (
    <>
      <PageHeader
        title="Schedule"
        description={can(user, 'jobs:view_all') ? 'Jobs, time off and blackout days.' : 'Your assigned jobs plus company time off.'}
        actions={
          <div className="flex items-center gap-1">
            <Link href={qs(prev)} className={buttonClass('secondary', 'sm', 'px-2')} aria-label="Previous month">
              <ChevronLeft className="size-4" />
            </Link>
            <Link href={qs(today.slice(0, 7))} className={buttonClass('secondary', 'sm')}>
              Today
            </Link>
            <Link href={qs(next)} className={buttonClass('secondary', 'sm', 'px-2')} aria-label="Next month">
              <ChevronRight className="size-4" />
            </Link>
            <Link href={qs(monthKey, !listView)} className={buttonClass('ghost', 'sm', 'hidden md:inline-flex')}>
              {listView ? 'Calendar view' : 'List view'}
            </Link>
          </div>
        }
      />

      <h2 className="mb-3 text-lg font-semibold text-slate-900">{formatMonth(monthStart)}</h2>

      {/* Calendar grid (tablet/desktop) */}
      {!listView ? (
        <Card className="mb-6 hidden overflow-hidden md:block">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          {weeks.map((w) => (
            <div
              key={w.days[0]}
              className="grid grid-cols-7 border-b border-slate-100 last:border-b-0"
              style={{ gridTemplateRows: `28px ${w.lanes ? `repeat(${w.lanes}, 26px) ` : ''}minmax(16px, 1fr)`, minHeight: 104 }}
            >
              {w.days.map((d, i) => {
                const inMonth = d >= monthStart && d <= monthEnd
                return (
                  <div
                    key={d}
                    style={{ gridColumn: i + 1, gridRow: '1 / -1' }}
                    className={cn('border-r border-slate-100 px-1.5 pt-1 last:border-r-0', !inMonth && 'bg-slate-50/70', d === today && 'bg-brand-soft')}
                  >
                    <span
                      className={cn(
                        'inline-flex size-6 items-center justify-center rounded-full text-xs',
                        d === today ? 'bg-brand font-bold text-white' : inMonth ? 'text-slate-700' : 'text-slate-400',
                      )}
                    >
                      {Number(d.slice(8))}
                    </span>
                  </div>
                )
              })}
              {w.items.map(({ ev, col, span, lane, contL, contR }) => {
                const cls = cn(
                  'z-10 mx-0.5 flex items-center truncate px-1.5 text-xs font-medium ring-1 ring-inset',
                  ev.color,
                  contL ? 'rounded-l-none' : 'rounded-l-md',
                  contR ? 'rounded-r-none' : 'rounded-r-md',
                )
                const style = { gridColumn: `${col} / span ${span}`, gridRow: lane + 2, marginBlock: 2 }
                const tip = `${ev.title}${ev.sub ? ` — ${ev.sub}` : ''} (${formatDate(ev.start)}${ev.end !== ev.start ? ` – ${formatDate(ev.end)}` : ''})`
                return ev.href ? (
                  <Link key={ev.key + w.days[0]} href={ev.href} className={cn(cls, 'hover:brightness-95')} style={style} title={tip}>
                    {ev.title}
                  </Link>
                ) : (
                  <div key={ev.key + w.days[0]} className={cls} style={style} title={tip}>
                    {ev.title}
                  </div>
                )
              })}
            </div>
          ))}
        </Card>
      ) : null}

      {/* List view (phones, or when chosen) */}
      <Card className={cn('mb-6', !listView && 'md:hidden')}>
        <CardHeader title={`${formatMonth(monthStart)} at a glance`} />
        {monthEvents.length ? (
          <ul className="divide-y divide-slate-100">
            {monthEvents.map((ev) => {
              const body = (
                <div className="flex items-start gap-3">
                  <span className={cn('mt-1 size-3 shrink-0 rounded-sm ring-1 ring-inset', ev.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{ev.title}</p>
                    <p className="text-sm text-slate-500">
                      {formatDate(ev.start)}
                      {ev.end !== ev.start ? ` – ${formatDate(ev.end)}` : ''}
                      {ev.sub ? ` · ${ev.sub}` : ''}
                    </p>
                  </div>
                  {ev.status ? <StatusBadge status={ev.status} /> : null}
                </div>
              )
              return (
                <li key={ev.key}>
                  {ev.href ? (
                    <Link href={ev.href} className="block px-4 py-3 hover:bg-slate-50 active:bg-slate-50">
                      {body}
                    </Link>
                  ) : (
                    <div className="px-4 py-3">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-slate-500">Nothing scheduled this month.</p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Time off & blackout days" description={`${formatMonth(monthStart)}`} />
          <div className="p-5">
            <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Whole-company blocks (blackouts, holidays, company time off) show those days as <strong>Booked</strong> on your public{' '}
              <Link href="/availability" target="_blank" className="inline-flex items-center gap-0.5 font-semibold underline">
                availability page <ExternalLink className="size-3" />
              </Link>
              . Individual time off doesn’t.
            </p>
            {monthBlocks.length ? (
              <ul className="mb-5 divide-y divide-slate-100">
                {monthBlocks.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{b.title}</p>
                      <p className="text-sm text-slate-500">
                        {formatDate(b.startDate)}
                        {b.endDate !== b.startDate ? ` – ${formatDate(b.endDate)}` : ''} · {label(b.kind)} · {b.userName ?? 'Whole company'}
                      </p>
                      {b.note ? <p className="text-xs text-slate-500">{b.note}</p> : null}
                    </div>
                    {manage ? (
                      <ConfirmButton action={deleteBlock} hidden={{ id: b.id }} variant="ghost" confirm={`Remove “${b.title}” from the schedule?`}>
                        Remove
                      </ConfirmButton>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-5 text-sm text-slate-500">No time off or blackouts this month.</p>
            )}

            {manage ? (
              <ActionForm action={addBlock} resetOnSuccess className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                <Field label="Title" htmlFor="block-title" className="col-span-2">
                  <Input id="block-title" name="title" required placeholder="e.g. Thanksgiving, Family vacation" />
                </Field>
                <Field label="Type" htmlFor="block-kind">
                  <Select id="block-kind" name="kind" defaultValue="blackout">
                    {BLOCK_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {label(k)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Who" htmlFor="block-user">
                  <Select id="block-user" name="userId" defaultValue="">
                    <option value="">Whole company</option>
                    {team.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Start" htmlFor="block-start">
                  <Input id="block-start" name="startDate" type="date" required defaultValue={today >= monthStart && today <= monthEnd ? today : monthStart} />
                </Field>
                <Field label="End" htmlFor="block-end">
                  <Input id="block-end" name="endDate" type="date" />
                </Field>
                <Field label="Note" htmlFor="block-note" className="col-span-2">
                  <Input id="block-note" name="note" placeholder="Optional" />
                </Field>
                <div className="col-span-2">
                  <SubmitButton variant="secondary">Add to schedule</SubmitButton>
                </div>
              </ActionForm>
            ) : null}
          </div>
        </Card>

        {unscheduled.length ? (
          <Card>
            <CardHeader title="Waiting to be scheduled" description="Pending jobs with no start date yet." />
            <ul className="divide-y divide-slate-100">
              {unscheduled.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{j.title}</p>
                    <p className="text-sm text-slate-500">{j.customerName}</p>
                  </div>
                  <LinkButton href={`/admin/projects/${j.id}`} size="sm" variant="secondary">
                    Set dates
                  </LinkButton>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  )
}
