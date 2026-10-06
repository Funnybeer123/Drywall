import 'server-only'
import { z } from 'zod'
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { invoices, leads, payments, projects, scheduleBlocks } from '@/db/schema'
import { getSettings } from '@/lib/settings'
import { addDays, todayISO } from '@/lib/dates'
import { computeAvailability, nextAvailable, parseWorkDays } from '@/lib/availability'
import { can } from '@/lib/permissions'
import { op } from '../framework'
import { jobOut, toDollars } from '../common'

async function availability(from: string, days: number) {
  const s = await getSettings()
  const to = addDays(from, days)
  const [jobs, blocks] = await Promise.all([
    db
      .select({ startDate: projects.startDate, endDate: projects.endDate, status: projects.status })
      .from(projects)
      .where(and(inArray(projects.status, ['scheduled', 'in_progress']), lte(projects.startDate, to))),
    db
      .select({ startDate: scheduleBlocks.startDate, endDate: scheduleBlocks.endDate, userId: scheduleBlocks.userId })
      .from(scheduleBlocks)
      .where(gte(scheduleBlocks.endDate, from)),
  ])
  return computeAvailability({ from, days, capacity: s.dailyCapacity, workDays: parseWorkDays(s.workDays), jobs, blocks })
}

export const coreOps = [
  op({
    id: 'get_business_overview',
    method: 'GET',
    path: '/overview',
    tag: 'Overview',
    scope: 'read',
    permission: 'dashboard:view',
    summary:
      'Snapshot of the business right now: today’s date, money collected this month and year, outstanding/overdue invoices, new leads, active jobs, upcoming jobs and the next open start date. Call this first to get context.',
    run: async ({ ctx }) => {
      const s = await getSettings()
      const today = todayISO()
      const monthStart = today.slice(0, 8) + '01'
      const yearStart = today.slice(0, 5) + '01-01'
      const money = can(ctx.user, 'reports:view')
      const [paid, open, newLeads, upcoming, days] = await Promise.all([
        db
          .select({
            month: sql<number>`coalesce(sum(case when ${payments.receivedAt} >= ${monthStart}::date then ${payments.amountCents} end), 0)::int`,
            year: sql<number>`coalesce(sum(case when ${payments.receivedAt} >= ${yearStart}::date then ${payments.amountCents} end), 0)::int`,
          })
          .from(payments),
        db.select().from(invoices).where(inArray(invoices.status, ['sent', 'partial'])),
        db.select({ n: sql<number>`count(*)::int` }).from(leads).where(eq(leads.status, 'new')),
        db
          .select()
          .from(projects)
          .where(
            and(
              inArray(projects.status, ['scheduled', 'in_progress']),
              lte(projects.startDate, addDays(today, 14)),
              gte(sql`coalesce(${projects.endDate}, ${projects.startDate})`, today),
            ),
          )
          .orderBy(asc(projects.startDate)),
        availability(addDays(today, 1), 90),
      ])
      const outstanding = open.reduce((sum, i) => sum + Math.max(0, i.totalCents - i.paidCents), 0)
      const overdue = open.filter((i) => i.dueDate < today)
      return {
        business: s.businessName,
        owner: s.ownerName,
        today,
        actingAs: { name: ctx.user.name, role: ctx.user.role },
        money: money
          ? {
              collectedThisMonth: toDollars(paid[0].month),
              collectedThisYear: toDollars(paid[0].year),
              outstanding: toDollars(outstanding),
              overdueInvoices: overdue.length,
              overdueAmount: toDollars(overdue.reduce((sum, i) => sum + i.totalCents - i.paidCents, 0)),
            }
          : undefined,
        newLeads: newLeads[0].n,
        upcomingJobs: upcoming.map(jobOut),
        nextAvailableStart: nextAvailable(days),
      }
    },
  }),

  op({
    id: 'get_availability',
    method: 'GET',
    path: '/availability',
    tag: 'Overview',
    scope: 'read',
    permission: 'schedule:view',
    summary: 'Day-by-day availability (open / limited / booked / closed) — the same data shown on the public calendar.',
    query: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date YYYY-MM-DD (default today)'),
      days: z.coerce.number().int().min(1).max(180).default(30).describe('How many days (default 30)'),
    }),
    run: async ({ query }) => {
      const days = await availability(query.from ?? todayISO(), query.days)
      return { nextAvailable: nextAvailable(days), days }
    },
  }),
]
