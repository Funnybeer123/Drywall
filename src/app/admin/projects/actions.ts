'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { customers, estimates, invoices, laborEntries, projectAssignments, projectPhotos, projects, users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { guard, int, reqStr, str, type ActionState, ValidationError } from '@/lib/action-state'
import { parseDollars } from '@/lib/money'
import { isValidISODate } from '@/lib/dates'
import { queueReviewRequest } from '@/lib/notify'
import { filesFrom, saveUpload } from '@/lib/storage'
import { requireProjectAccess } from '../_ops/access'
import { PHOTO_KINDS, PROJECT_STATUSES } from '../_ops/constants'

type ProjectStatus = (typeof PROJECT_STATUSES)[number]

function refresh(id?: number) {
  revalidatePath('/admin/projects')
  if (id) revalidatePath(`/admin/projects/${id}`)
  revalidatePath('/admin/schedule')
  revalidatePath('/admin')
}

function readDates(fd: FormData) {
  const startDate = str(fd, 'startDate')
  const endDate = str(fd, 'endDate')
  if (startDate && !isValidISODate(startDate)) throw new ValidationError('Start date is invalid.')
  if (endDate && !isValidISODate(endDate)) throw new ValidationError('End date is invalid.')
  if (endDate && !startDate) throw new ValidationError('Set a start date before an end date.')
  if (startDate && endDate && endDate < startDate) throw new ValidationError('End date can’t be before the start date.')
  return { startDate, endDate }
}

function readQuote(fd: FormData): number {
  const raw = str(fd, 'quoted')
  if (!raw) return 0
  const cents = parseDollars(raw)
  if (cents == null || cents < 0) throw new ValidationError('Quoted amount must be a dollar amount.')
  return cents
}

function readStatus(fd: FormData): ProjectStatus {
  const s = str(fd, 'status') as ProjectStatus | null
  if (!s || !PROJECT_STATUSES.includes(s)) throw new ValidationError('Pick a valid status.')
  return s
}

export async function createProject(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('jobs:manage')
  let id = 0
  const res = await guard(async () => {
    const customerId = int(fd, 'customerId')
    if (!customerId) throw new ValidationError('Choose a customer.')
    const [c] = await db.select().from(customers).where(eq(customers.id, customerId))
    if (!c) throw new ValidationError('Customer not found.')
    const dates = readDates(fd)
    const status = readStatus(fd)
    if (status === 'scheduled' && !dates.startDate) throw new ValidationError('Scheduled jobs need a start date.')
    const [row] = await db
      .insert(projects)
      .values({
        customerId,
        title: reqStr(fd, 'title', 'Title').slice(0, 200),
        description: str(fd, 'description')?.slice(0, 5000) ?? null,
        // Default the job site to the customer's address.
        address: str(fd, 'address')?.slice(0, 200) ?? c.address,
        city: str(fd, 'city')?.slice(0, 100) ?? c.city,
        ...dates,
        quotedCents: readQuote(fd),
        status,
        completedAt: status === 'completed' ? new Date() : null,
      })
      .returning({ id: projects.id })
    id = row.id
    if (status === 'completed') await queueReviewRequest(id)
  })
  if (res.error) return res
  refresh(id)
  redirect(`/admin/projects/${id}`)
}

export async function updateProject(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('jobs:manage')
  return guard(async () => {
    const p = await requireProjectAccess(user, id)
    const dates = readDates(fd)
    if (p.status === 'scheduled' && !dates.startDate) throw new ValidationError('Scheduled jobs need a start date.')
    await db
      .update(projects)
      .set({
        title: reqStr(fd, 'title', 'Title').slice(0, 200),
        description: str(fd, 'description')?.slice(0, 5000) ?? null,
        address: str(fd, 'address')?.slice(0, 200) ?? null,
        city: str(fd, 'city')?.slice(0, 100) ?? null,
        ...dates,
        quotedCents: readQuote(fd),
      })
      .where(eq(projects.id, id))
    refresh(id)
    return { ok: true, message: 'Job saved.' }
  })
}

export async function setProjectStatus(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('jobs:manage')
  return guard(async () => {
    const p = await requireProjectAccess(user, id)
    const status = readStatus(fd)
    if (status === 'scheduled' && !p.startDate) throw new ValidationError('Set a start date (Edit details) before marking the job scheduled.')
    await db
      .update(projects)
      .set({ status, completedAt: status === 'completed' ? (p.completedAt ?? new Date()) : null })
      .where(eq(projects.id, id))
    if (status === 'completed' && p.status !== 'completed') await queueReviewRequest(id)
    refresh(id)
    return { ok: true, message: status === 'completed' ? 'Marked completed — a review request is queued.' : 'Status updated.' }
  })
}

export async function updateProjectNotes(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('jobs:manage')
  return guard(async () => {
    await requireProjectAccess(user, id)
    await db.update(projects).set({ notes: str(fd, 'notes')?.slice(0, 10000) ?? null }).where(eq(projects.id, id))
    refresh(id)
    return { ok: true, message: 'Notes saved.' }
  })
}

export async function setCrew(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('jobs:manage')
  return guard(async () => {
    await requireProjectAccess(user, id)
    const wanted = fd
      .getAll('userId')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
    const valid = wanted.length
      ? await db.select({ id: users.id }).from(users).where(and(inArray(users.id, wanted), eq(users.active, true)))
      : []
    await db.transaction(async (tx) => {
      await tx.delete(projectAssignments).where(eq(projectAssignments.projectId, id))
      if (valid.length) await tx.insert(projectAssignments).values(valid.map((u) => ({ projectId: id, userId: u.id })))
    })
    refresh(id)
    return { ok: true, message: `Crew updated (${valid.length} assigned).` }
  })
}

export async function addPhotos(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('jobs:add_photos')
  return guard(async () => {
    await requireProjectAccess(user, id)
    const files = filesFrom(fd, 'photos')
    if (!files.length) throw new ValidationError('Choose at least one photo.')
    if (files.length > 12) throw new ValidationError('Upload up to 12 photos at a time.')
    const kindRaw = str(fd, 'kind') ?? 'progress'
    const kind = PHOTO_KINDS.find((k) => k === kindRaw) ?? 'progress'
    const caption = str(fd, 'caption')?.slice(0, 300) ?? null
    const urls: string[] = []
    for (const f of files) {
      if (!f.type.startsWith('image/')) throw new ValidationError('Only image files can be added as job photos.')
      urls.push(await saveUpload(f, 'projects'))
    }
    await db.insert(projectPhotos).values(urls.map((url) => ({ projectId: id, url, kind, caption, uploadedBy: user.id })))
    revalidatePath(`/admin/projects/${id}`)
    return { ok: true, message: `${urls.length} photo${urls.length === 1 ? '' : 's'} added.` }
  })
}

/** Managers can remove any photo; crew can remove photos they uploaded themselves. */
export async function deletePhoto(fd: FormData): Promise<void> {
  const user = await requireUser('jobs:add_photos')
  const photoId = Number(fd.get('photoId'))
  if (!Number.isInteger(photoId) || photoId <= 0) return
  const [photo] = await db.select().from(projectPhotos).where(eq(projectPhotos.id, photoId))
  if (!photo) return
  await requireProjectAccess(user, photo.projectId)
  if (!can(user, 'jobs:manage') && photo.uploadedBy !== user.id) return
  await db.delete(projectPhotos).where(eq(projectPhotos.id, photoId))
  revalidatePath(`/admin/projects/${photo.projectId}`)
}

export async function addLabor(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('labor:manage')
  return guard(async () => {
    await requireProjectAccess(user, id)
    const date = str(fd, 'date')
    if (!date || !isValidISODate(date)) throw new ValidationError('Pick the date worked.')
    const hours = Number(str(fd, 'hours'))
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 31) throw new ValidationError('Enter the hours worked.')
    const rateInput = str(fd, 'rate')
    const rateTyped = rateInput ? parseDollars(rateInput) : null
    if (rateInput && (rateTyped == null || rateTyped < 0)) throw new ValidationError('Hourly rate must be a dollar amount.')

    const userId = int(fd, 'userId')
    let workerName: string
    let rateCents: number
    if (userId) {
      const [w] = await db.select().from(users).where(eq(users.id, userId))
      if (!w) throw new ValidationError('Team member not found.')
      workerName = w.name
      // Only the owner may override a team member's pay rate (managers can't see rates).
      rateCents = can(user, 'pay_rates:view') && rateTyped != null ? rateTyped : w.payRateCents
    } else {
      workerName = reqStr(fd, 'workerName', 'Worker name').slice(0, 120)
      if (rateTyped == null) throw new ValidationError('Enter an hourly rate for workers who aren’t on the team.')
      rateCents = rateTyped
    }

    await db.insert(laborEntries).values({
      projectId: id,
      userId: userId ?? null,
      workerName,
      date,
      hours: Math.round(hours * 100) / 100,
      rateCents,
      note: str(fd, 'note')?.slice(0, 500) ?? null,
      createdBy: user.id,
    })
    revalidatePath(`/admin/projects/${id}`)
    revalidatePath('/admin/reports')
    return { ok: true, message: 'Labor added.' }
  })
}

export async function deleteLabor(fd: FormData): Promise<void> {
  const user = await requireUser('labor:manage')
  const entryId = Number(fd.get('entryId'))
  if (!Number.isInteger(entryId) || entryId <= 0) return
  const [entry] = await db.select().from(laborEntries).where(eq(laborEntries.id, entryId))
  if (!entry) return
  await requireProjectAccess(user, entry.projectId)
  await db.delete(laborEntries).where(eq(laborEntries.id, entryId))
  revalidatePath(`/admin/projects/${entry.projectId}`)
  revalidatePath('/admin/reports')
}

/** Jobs that have invoices can't be deleted (cancel them instead). Linked estimates are unlinked. */
export async function deleteProject(fd: FormData): Promise<void> {
  const user = await requireUser('jobs:manage')
  const id = Number(fd.get('id'))
  const p = await requireProjectAccess(user, id)
  const [inv] = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.projectId, p.id)).limit(1)
  if (inv) throw new ValidationError('This job has invoices — mark it Cancelled instead.')
  await db.transaction(async (tx) => {
    await tx.update(estimates).set({ projectId: null }).where(eq(estimates.projectId, p.id))
    await tx.delete(projects).where(eq(projects.id, p.id))
  })
  refresh()
  redirect('/admin/projects')
}
