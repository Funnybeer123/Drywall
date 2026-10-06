import 'server-only'
import { z } from 'zod'
import { and, asc, desc, eq, gte, inArray, lte, or, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  customers,
  expenses,
  laborEntries,
  projectAssignments,
  projectPhotos,
  projects,
  scheduleBlocks,
  users,
  type Project,
} from '@/db/schema'
import { can } from '@/lib/permissions'
import { queueReviewRequest } from '@/lib/notify'
import { getProjectFinancials } from '@/lib/profit'
import { addDays, todayISO } from '@/lib/dates'
import type { SessionUser } from '@/lib/auth'
import { ApiError, badRequest, notFound, op } from '../framework'
import { absolute, customerOut, expenseOut, idParam, jobOut, saveBase64Upload, toCents, toDollars, zDate, zDollars, zId, zLimit, zText, zUpload } from '../common'

const JOB_STATUS = z.enum(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'])

/** Crew members only see jobs they're assigned to — same rule as the dashboard. */
function jobScope(user: SessionUser) {
  if (can(user, 'jobs:view_all')) return undefined
  return inArray(
    projects.id,
    db.select({ id: projectAssignments.projectId }).from(projectAssignments).where(eq(projectAssignments.userId, user.id)),
  )
}

async function loadJob(user: SessionUser, id: number): Promise<Project> {
  const [p] = await db.select().from(projects).where(and(eq(projects.id, id), jobScope(user)))
  if (!p) throw notFound('Job')
  return p
}

function checkDates(startDate: string | null | undefined, endDate: string | null | undefined, status: string) {
  if (endDate && !startDate) throw badRequest('Set a startDate before an endDate.')
  if (startDate && endDate && endDate < startDate) throw badRequest('endDate can’t be before startDate.')
  if (status === 'scheduled' && !startDate) throw badRequest('Scheduled jobs need a startDate.')
}

export const jobOps = [
  op({
    id: 'list_jobs',
    method: 'GET',
    path: '/jobs',
    tag: 'Jobs',
    scope: 'read',
    permission: 'jobs:view_assigned',
    summary: 'List jobs (projects). Filter by status and/or a date window (jobs overlapping from–to).',
    query: z.object({
      status: JOB_STATUS.optional(),
      from: zDate.optional(),
      to: zDate.optional(),
      customerId: zId.optional(),
      limit: zLimit,
    }),
    run: async ({ query, ctx }) => {
      const rows = await db
        .select({ p: projects, customerName: customers.name })
        .from(projects)
        .innerJoin(customers, eq(customers.id, projects.customerId))
        .where(
          and(
            jobScope(ctx.user),
            query.status ? eq(projects.status, query.status) : undefined,
            query.customerId ? eq(projects.customerId, query.customerId) : undefined,
            query.to ? lte(projects.startDate, query.to) : undefined,
            query.from ? gte(sql`coalesce(${projects.endDate}, ${projects.startDate})`, query.from) : undefined,
          ),
        )
        .orderBy(desc(projects.createdAt))
        .limit(query.limit)
      return { jobs: rows.map((r) => ({ ...jobOut(r.p), customerName: r.customerName })) }
    },
  }),
  op({
    id: 'get_job',
    method: 'GET',
    path: '/jobs/{jobId}',
    tag: 'Jobs',
    scope: 'read',
    permission: 'jobs:view_assigned',
    summary: 'Get a job with customer, crew, photos, expenses, labor and (for the owner) profit.',
    params: idParam('jobId', 'Job id'),
    run: async ({ params, ctx }) => {
      const p = await loadJob(ctx.user, params.jobId)
      const seeMoney = can(ctx.user, 'expenses:manage')
      const [cust, crew, photos, exp, labor] = await Promise.all([
        db.select().from(customers).where(eq(customers.id, p.customerId)),
        db
          .select({ id: users.id, name: users.name, role: users.role })
          .from(projectAssignments)
          .innerJoin(users, eq(users.id, projectAssignments.userId))
          .where(eq(projectAssignments.projectId, p.id)),
        db.select().from(projectPhotos).where(eq(projectPhotos.projectId, p.id)).orderBy(asc(projectPhotos.createdAt)),
        seeMoney ? db.select().from(expenses).where(eq(expenses.projectId, p.id)).orderBy(desc(expenses.date)) : [],
        can(ctx.user, 'labor:manage') ? db.select().from(laborEntries).where(eq(laborEntries.projectId, p.id)) : [],
      ])
      const fin = can(ctx.user, 'job_profit:view') ? (await getProjectFinancials([p.id])).get(p.id) : undefined
      const rates = can(ctx.user, 'pay_rates:view')
      return {
        job: jobOut(p),
        customer: cust[0] ? customerOut(cust[0]) : null,
        crew,
        photos: photos.map((ph) => ({ id: ph.id, kind: ph.kind, caption: ph.caption, url: absolute(ph.url) })),
        expenses: seeMoney ? exp.map(expenseOut) : undefined,
        labor: labor.map((l) => ({
          id: l.id,
          worker: l.workerName,
          date: l.date,
          hours: l.hours,
          rate: rates ? toDollars(l.rateCents) : undefined,
          cost: rates ? toDollars(Math.round(l.hours * l.rateCents)) : undefined,
        })),
        profit: fin
          ? {
              basis: fin.projected ? 'projected from quote (nothing invoiced yet)' : 'invoiced amounts',
              quoted: toDollars(fin.quotedCents),
              invoiced: toDollars(fin.invoicedCents),
              collected: toDollars(fin.collectedCents),
              materialsAndExpenses: toDollars(fin.expenseCents),
              labor: toDollars(fin.laborCents),
              profit: toDollars(fin.profitCents),
              marginPercent: fin.marginPct == null ? null : Math.round(fin.marginPct * 10) / 10,
            }
          : undefined,
      }
    },
  }),
  op({
    id: 'create_job',
    method: 'POST',
    path: '/jobs',
    tag: 'Jobs',
    scope: 'write',
    permission: 'jobs:manage',
    summary: 'Create a job for a customer. Address defaults to the customer’s. Status "scheduled" needs a startDate.',
    body: z.object({
      customerId: zId,
      title: zText(200).min(1),
      description: zText(5000).optional(),
      address: zText(200).optional(),
      city: zText(100).optional(),
      startDate: zDate.optional(),
      endDate: zDate.optional(),
      quoted: zDollars.default(0).describe('Quoted price in dollars (pre-tax)'),
      status: JOB_STATUS.default('pending'),
      notes: zText(10000).optional(),
    }),
    run: async ({ body }) => {
      const [c] = await db.select().from(customers).where(eq(customers.id, body.customerId))
      if (!c) throw notFound('Customer')
      checkDates(body.startDate, body.endDate, body.status)
      const { quoted, ...rest } = body
      const [p] = await db
        .insert(projects)
        .values({
          ...rest,
          address: body.address ?? c.address,
          city: body.city ?? c.city,
          quotedCents: toCents(quoted),
          completedAt: body.status === 'completed' ? new Date() : null,
        })
        .returning()
      if (p.status === 'completed') await queueReviewRequest(p.id)
      return { job: jobOut(p) }
    },
  }),
  op({
    id: 'update_job',
    method: 'PATCH',
    path: '/jobs/{jobId}',
    tag: 'Jobs',
    scope: 'write',
    permission: 'jobs:manage',
    summary:
      'Update a job: details, dates (schedule it), quoted price, notes or status. Setting status to "completed" automatically queues a Google review request to the customer.',
    params: idParam('jobId', 'Job id'),
    body: z.object({
      title: zText(200).min(1).optional(),
      description: zText(5000).nullable().optional(),
      address: zText(200).nullable().optional(),
      city: zText(100).nullable().optional(),
      startDate: zDate.nullable().optional(),
      endDate: zDate.nullable().optional(),
      quoted: zDollars.optional(),
      status: JOB_STATUS.optional(),
      notes: zText(10000).nullable().optional(),
    }),
    run: async ({ params, body, ctx }) => {
      const p = await loadJob(ctx.user, params.jobId)
      if (!Object.keys(body).length) throw badRequest('Nothing to update.')
      const { quoted, ...rest } = body
      const startDate = body.startDate === undefined ? p.startDate : body.startDate
      const endDate = body.endDate === undefined ? p.endDate : body.endDate
      const status = body.status ?? p.status
      checkDates(startDate, endDate, status)
      const [updated] = await db
        .update(projects)
        .set({
          ...rest,
          ...(quoted !== undefined ? { quotedCents: toCents(quoted) } : {}),
          ...(body.status ? { completedAt: body.status === 'completed' ? (p.completedAt ?? new Date()) : null } : {}),
        })
        .where(eq(projects.id, p.id))
        .returning()
      const reviewQueued = body.status === 'completed' && p.status !== 'completed'
      if (reviewQueued) await queueReviewRequest(p.id)
      return { job: jobOut(updated), reviewRequestQueued: reviewQueued || undefined }
    },
  }),
  op({
    id: 'set_job_crew',
    method: 'POST',
    path: '/jobs/{jobId}/crew',
    tag: 'Jobs',
    scope: 'write',
    permission: 'jobs:manage',
    summary: 'Set who is assigned to a job (replaces the current crew). Get user ids from list_team.',
    params: idParam('jobId', 'Job id'),
    body: z.object({ userIds: z.array(zId).max(50) }),
    run: async ({ params, body, ctx }) => {
      const p = await loadJob(ctx.user, params.jobId)
      const valid = body.userIds.length
        ? await db.select({ id: users.id, name: users.name }).from(users).where(and(inArray(users.id, body.userIds), eq(users.active, true)))
        : []
      await db.transaction(async (tx) => {
        await tx.delete(projectAssignments).where(eq(projectAssignments.projectId, p.id))
        if (valid.length) await tx.insert(projectAssignments).values(valid.map((u) => ({ projectId: p.id, userId: u.id })))
      })
      return { jobId: p.id, crew: valid }
    },
  }),
  op({
    id: 'add_labor',
    method: 'POST',
    path: '/jobs/{jobId}/labor',
    tag: 'Jobs',
    scope: 'write',
    permission: 'labor:manage',
    summary:
      'Log hours worked on a job. Pass userId for a team member (their pay rate is used), or workerName + rate for a sub/helper not on the team.',
    params: idParam('jobId', 'Job id'),
    body: z.object({
      date: zDate,
      hours: z.number().positive().max(744),
      userId: zId.optional(),
      workerName: zText(120).optional(),
      rate: zDollars.optional().describe('Hourly rate in dollars (required for non-team workers; owner may override for team members)'),
      note: zText(500).optional(),
      allowDuplicate: z
        .boolean()
        .default(false)
        .describe('Set true only if the same worker really worked the same hours on this job twice on that date'),
    }),
    run: async ({ params, body, ctx }) => {
      const p = await loadJob(ctx.user, params.jobId)
      const hours = Math.round(body.hours * 100) / 100
      if (!body.allowDuplicate) {
        // Catch the most common assistant slip: logging the same hours twice (e.g. after a retry).
        const [dupe] = await db
          .select({ id: laborEntries.id })
          .from(laborEntries)
          .where(
            and(
              eq(laborEntries.projectId, p.id),
              eq(laborEntries.date, body.date),
              eq(laborEntries.hours, hours),
              body.userId ? eq(laborEntries.userId, body.userId) : eq(laborEntries.workerName, body.workerName ?? ''),
            ),
          )
          .limit(1)
        if (dupe) {
          throw new ApiError(
            409,
            'duplicate',
            `Labor entry #${dupe.id} already logs ${hours} hours for this worker on ${body.date}. Not added again — pass allowDuplicate: true if this is really a second shift.`,
          )
        }
      }
      let workerName: string
      let rateCents: number
      if (body.userId) {
        const [w] = await db.select().from(users).where(eq(users.id, body.userId))
        if (!w) throw notFound('Team member')
        workerName = w.name
        rateCents = can(ctx.user, 'pay_rates:view') && body.rate != null ? toCents(body.rate) : w.payRateCents
      } else {
        if (!body.workerName) throw badRequest('Give either userId or workerName.')
        if (body.rate == null) throw badRequest('rate is required for workers who aren’t on the team.')
        workerName = body.workerName
        rateCents = toCents(body.rate)
      }
      const [row] = await db
        .insert(laborEntries)
        .values({
          projectId: p.id,
          userId: body.userId ?? null,
          workerName,
          date: body.date,
          hours,
          rateCents,
          note: body.note ?? null,
          createdBy: ctx.user.id,
        })
        .returning()
      return { laborEntry: { id: row.id, jobId: p.id, worker: row.workerName, date: row.date, hours: row.hours } }
    },
  }),
  op({
    id: 'delete_labor',
    method: 'DELETE',
    path: '/jobs/{jobId}/labor/{laborEntryId}',
    tag: 'Jobs',
    scope: 'write',
    permission: 'labor:manage',
    summary: 'Delete a labor entry logged by mistake (e.g. a duplicate). Get laborEntryId from get_job.',
    params: z.object({ jobId: zId.describe('Job id'), laborEntryId: zId.describe('Labor entry id (from get_job → labor[].id)') }),
    run: async ({ params, ctx }) => {
      const p = await loadJob(ctx.user, params.jobId)
      const [row] = await db
        .delete(laborEntries)
        .where(and(eq(laborEntries.id, params.laborEntryId), eq(laborEntries.projectId, p.id)))
        .returning()
      if (!row) throw notFound('Labor entry on this job')
      return { deleted: { id: row.id, worker: row.workerName, date: row.date, hours: row.hours } }
    },
  }),
  op({
    id: 'add_job_photo',
    method: 'POST',
    path: '/jobs/{jobId}/photos',
    tag: 'Jobs',
    scope: 'write',
    permission: 'jobs:add_photos',
    summary: 'Attach a before/progress/after photo to a job (image sent as base64).',
    params: idParam('jobId', 'Job id'),
    body: z.object({
      photo: zUpload,
      kind: z.enum(['before', 'progress', 'after']).default('progress'),
      caption: zText(300).optional(),
    }),
    run: async ({ params, body, ctx }) => {
      const p = await loadJob(ctx.user, params.jobId)
      if (!body.photo.contentType.startsWith('image/')) throw badRequest('Job photos must be images.')
      const url = await saveBase64Upload(body.photo, 'projects')
      const [ph] = await db
        .insert(projectPhotos)
        .values({ projectId: p.id, url, kind: body.kind, caption: body.caption ?? null, uploadedBy: ctx.user.id })
        .returning()
      return { photo: { id: ph.id, url: absolute(ph.url), kind: ph.kind } }
    },
  }),

  // ---------- Team & schedule ----------
  op({
    id: 'list_team',
    method: 'GET',
    path: '/team',
    tag: 'Team',
    scope: 'read',
    permission: 'jobs:manage',
    summary: 'List active team members (ids, names, roles) — use the ids for crew assignment and labor.',
    run: async ({ ctx }) => {
      const rows = await db.select().from(users).where(eq(users.active, true)).orderBy(asc(users.name))
      const rates = can(ctx.user, 'pay_rates:view')
      return {
        team: rows.map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          phone: u.phone,
          payRate: rates ? toDollars(u.payRateCents) : undefined,
        })),
      }
    },
  }),
  op({
    id: 'get_schedule',
    method: 'GET',
    path: '/schedule',
    tag: 'Schedule',
    scope: 'read',
    permission: 'schedule:view',
    summary: 'Jobs and time-off/blackout blocks between two dates.',
    query: z.object({ from: zDate.optional().describe('Default today'), to: zDate.optional().describe('Default from + 30 days') }),
    run: async ({ query, ctx }) => {
      const from = query.from ?? todayISO()
      const to = query.to ?? addDays(from, 30)
      const [jobs, blocks] = await Promise.all([
        db
          .select({ p: projects, customerName: customers.name })
          .from(projects)
          .innerJoin(customers, eq(customers.id, projects.customerId))
          .where(
            and(
              jobScope(ctx.user),
              lte(projects.startDate, to),
              gte(sql`coalesce(${projects.endDate}, ${projects.startDate})`, from),
            ),
          )
          .orderBy(asc(projects.startDate)),
        db
          .select()
          .from(scheduleBlocks)
          .where(
            and(
              lte(scheduleBlocks.startDate, to),
              gte(scheduleBlocks.endDate, from),
              can(ctx.user, 'schedule:manage') ? undefined : or(isNull(scheduleBlocks.userId), eq(scheduleBlocks.userId, ctx.user.id)),
            ),
          )
          .orderBy(asc(scheduleBlocks.startDate)),
      ])
      return {
        from,
        to,
        jobs: jobs.map((r) => ({ ...jobOut(r.p), customerName: r.customerName })),
        blocks: blocks.map((b) => ({
          id: b.id,
          title: b.title,
          kind: b.kind,
          startDate: b.startDate,
          endDate: b.endDate,
          userId: b.userId,
          wholeCompany: b.userId == null,
          note: b.note,
        })),
      }
    },
  }),
  op({
    id: 'create_schedule_block',
    method: 'POST',
    path: '/schedule/blocks',
    tag: 'Schedule',
    scope: 'write',
    permission: 'schedule:manage',
    summary:
      'Block off dates: time off, a blackout or a holiday. Leave userId empty to block the whole company (shows as Booked on the public calendar).',
    body: z.object({
      title: zText(120).min(1),
      kind: z.enum(['time_off', 'blackout', 'holiday']).default('blackout'),
      startDate: zDate,
      endDate: zDate,
      userId: zId.optional().describe('Only for one person’s time off'),
      note: zText(500).optional(),
    }),
    run: async ({ body }) => {
      if (body.endDate < body.startDate) throw badRequest('endDate can’t be before startDate.')
      const [b] = await db.insert(scheduleBlocks).values(body).returning()
      return { block: b }
    },
  }),
  op({
    id: 'delete_schedule_block',
    method: 'DELETE',
    path: '/schedule/blocks/{blockId}',
    tag: 'Schedule',
    scope: 'write',
    permission: 'schedule:manage',
    summary: 'Remove a time-off / blackout block.',
    params: idParam('blockId', 'Schedule block id'),
    run: async ({ params }) => {
      const [b] = await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, params.blockId)).returning()
      if (!b) throw notFound('Schedule block')
      return { deleted: b.id }
    },
  }),
]
