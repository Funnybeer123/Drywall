'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { customers, estimates, invoices, leads, type Estimate } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { bool, guard, int, lineItems, reqStr, str, taxBps, type ActionState, ValidationError } from '@/lib/action-state'
import { saveEstimateItems } from '@/lib/billing'
import { sendEstimate } from '@/lib/notify'
import { isValidISODate } from '@/lib/dates'
import { newToken } from '@/lib/utils'
import { createProjectFromEstimate } from './convert'

async function loadEstimate(id: number): Promise<Estimate> {
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Estimate not found.')
  const [e] = await db.select().from(estimates).where(eq(estimates.id, id))
  if (!e) throw new ValidationError('Estimate not found.')
  return e
}

function refresh(id?: number) {
  revalidatePath('/admin/estimates')
  if (id) revalidatePath(`/admin/estimates/${id}`)
  revalidatePath('/admin')
}

function readHeader(fd: FormData) {
  const validUntil = str(fd, 'validUntil')
  if (validUntil && !isValidISODate(validUntil)) throw new ValidationError('Valid-until date is invalid.')
  return {
    title: reqStr(fd, 'title', 'Title').slice(0, 200),
    notes: str(fd, 'notes')?.slice(0, 5000) ?? null,
    validUntil,
  }
}

export async function createEstimate(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('estimates:manage')
  let id = 0
  const res = await guard(async () => {
    const customerId = int(fd, 'customerId')
    if (!customerId) throw new ValidationError('Choose a customer.')
    const [c] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId))
    if (!c) throw new ValidationError('Customer not found.')
    let leadId = int(fd, 'leadId')
    if (leadId) {
      const [l] = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, leadId))
      if (!l) leadId = null
    }
    const header = readHeader(fd)
    const items = lineItems(fd)
    const tax = taxBps(fd)
    const [row] = await db
      .insert(estimates)
      .values({ ...header, customerId, leadId: leadId ?? null, token: newToken(), taxRateBps: tax })
      .returning({ id: estimates.id })
    await saveEstimateItems(row.id, items, tax)
    id = row.id
  })
  if (res.error) return res
  refresh(id)
  redirect(`/admin/estimates/${id}`)
}

export async function updateEstimate(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('estimates:manage')
  return guard(async () => {
    const est = await loadEstimate(id)
    if (est.status === 'accepted' || est.status === 'declined') {
      throw new ValidationError('Accepted or declined estimates can’t be edited. Reopen it first.')
    }
    const header = readHeader(fd)
    const items = lineItems(fd)
    await db.update(estimates).set(header).where(eq(estimates.id, id))
    await saveEstimateItems(id, items, taxBps(fd))
    refresh(id)
    return { ok: true, message: 'Estimate saved.' }
  })
}

export async function sendEstimateAction(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('estimates:manage')
  return guard(async () => {
    const est = await loadEstimate(id)
    if (est.status === 'declined') throw new ValidationError('This estimate was declined. Reopen it before sending.')
    const viaSms = bool(fd, 'sms')
    const [c] = await db.select().from(customers).where(eq(customers.id, est.customerId))
    if (!c?.email && !(viaSms && c?.phone)) {
      throw new ValidationError(
        c?.phone ? 'This customer has no email — check “Also send by text”, or add an email.' : 'Add an email or phone number to the customer first.',
      )
    }
    const results = await sendEstimate(id, viaSms)
    const delivered = results.filter((r) => !r.includes('failed'))
    if (!delivered.length) throw new ValidationError(`Couldn’t send: ${results.join(', ')}`)

    await db
      .update(estimates)
      .set({ sentAt: new Date(), ...(est.status === 'draft' ? { status: 'sent' as const } : {}) })
      .where(eq(estimates.id, id))
    if (est.leadId) {
      await db
        .update(leads)
        .set({ status: 'estimate_sent' })
        .where(and(eq(leads.id, est.leadId), inArray(leads.status, ['new', 'contacted'])))
      revalidatePath(`/admin/leads/${est.leadId}`)
      revalidatePath('/admin/leads')
    }
    refresh(id)
    return { ok: true, message: `Sent by ${results.join(' and ')}.` }
  })
}

/** Manually mark accepted / declined (e.g. customer said yes on the phone), or reopen. */
export async function setEstimateStatus(fd: FormData): Promise<void> {
  const user = await requireUser('estimates:manage')
  const id = Number(fd.get('id'))
  const status = String(fd.get('status'))
  const est = await loadEstimate(id)

  if (status === 'accepted') {
    await db
      .update(estimates)
      .set({ status: 'accepted', acceptedAt: est.acceptedAt ?? new Date(), acceptedName: est.acceptedName ?? `Marked accepted by ${user.name}` })
      .where(eq(estimates.id, id))
    if (est.leadId) await db.update(leads).set({ status: 'won' }).where(eq(leads.id, est.leadId))
  } else if (status === 'declined') {
    await db.update(estimates).set({ status: 'declined' }).where(eq(estimates.id, id))
  } else if (status === 'reopen') {
    await db
      .update(estimates)
      .set({ status: est.sentAt ? 'sent' : 'draft', acceptedAt: null, acceptedName: null })
      .where(eq(estimates.id, id))
  } else {
    return
  }
  if (est.leadId) revalidatePath(`/admin/leads/${est.leadId}`)
  refresh(id)
}

export async function convertEstimateToJob(fd: FormData): Promise<void> {
  await requireUser('estimates:manage')
  await requireUser('jobs:manage')
  const est = await loadEstimate(Number(fd.get('id')))
  const projectId = await createProjectFromEstimate(est)
  refresh(est.id)
  revalidatePath('/admin/projects')
  redirect(`/admin/projects/${projectId}`)
}

export async function deleteEstimate(fd: FormData): Promise<void> {
  await requireUser('estimates:manage')
  const est = await loadEstimate(Number(fd.get('id')))
  const [inv] = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.estimateId, est.id)).limit(1)
  if (inv) throw new ValidationError('This estimate has invoices and can’t be deleted.')
  await db.delete(estimates).where(eq(estimates.id, est.id))
  refresh()
  redirect('/admin/estimates')
}
