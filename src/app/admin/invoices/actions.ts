'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { customers, estimates, invoices, payments, projects } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import {
  guard,
  int,
  bool,
  lineItems,
  str,
  taxBps,
  ValidationError,
  type ActionState,
} from '@/lib/action-state'
import { balanceDue, nextInvoiceNumber, recordPayment, refreshInvoiceStatus, saveInvoiceItems } from '@/lib/billing'
import { sendInvoice } from '@/lib/notify'
import { formatCents, parseDollars } from '@/lib/money'
import { isValidISODate, todayISO } from '@/lib/dates'
import { newToken } from '@/lib/utils'
import { MANUAL_PAYMENT_METHODS } from './shared'

const KINDS = ['standard', 'deposit', 'progress', 'final'] as const
type Kind = (typeof KINDS)[number]

function revalidateInvoice(id: number, projectId?: number | null) {
  revalidatePath('/admin/invoices')
  revalidatePath(`/admin/invoices/${id}`)
  revalidatePath('/admin')
  if (projectId) revalidatePath(`/admin/projects/${projectId}`)
}

function readDates(fd: FormData) {
  const issueDate = str(fd, 'issueDate')
  const dueDate = str(fd, 'dueDate')
  if (!isValidISODate(issueDate)) throw new ValidationError('Issue date is required.')
  if (!isValidISODate(dueDate)) throw new ValidationError('Due date is required.')
  if (dueDate < issueDate) throw new ValidationError('Due date can’t be before the issue date.')
  return { issueDate, dueDate }
}

function readKind(fd: FormData): Kind {
  const k = str(fd, 'kind') ?? 'standard'
  return (KINDS as readonly string[]).includes(k) ? (k as Kind) : 'standard'
}

async function loadInvoice(fd: FormData) {
  const id = int(fd, 'id')
  if (!id) throw new ValidationError('Invoice not found.')
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, id))
  if (!inv) throw new ValidationError('Invoice not found.')
  return inv
}

// ---------- Create ----------

export async function createInvoiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('invoices:manage')
  let newId = 0
  const result = await guard(async () => {
    const customerId = int(fd, 'customerId')
    if (!customerId) throw new ValidationError('Pick a customer.')
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId))
    if (!customer) throw new ValidationError('Customer not found.')

    let projectId = int(fd, 'projectId')
    if (projectId) {
      const [p] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.customerId, customerId)))
      if (!p) throw new ValidationError('That job doesn’t belong to this customer.')
    } else projectId = null

    let estimateId = int(fd, 'estimateId')
    if (estimateId) {
      const [e] = await db
        .select({ id: estimates.id })
        .from(estimates)
        .where(and(eq(estimates.id, estimateId), eq(estimates.customerId, customerId)))
      if (!e) estimateId = null
    } else estimateId = null

    const { issueDate, dueDate } = readDates(fd)
    const items = lineItems(fd)
    const rate = taxBps(fd)

    const values = {
      customerId,
      projectId,
      estimateId,
      kind: readKind(fd),
      status: 'draft' as const,
      token: newToken(),
      issueDate,
      dueDate,
      taxRateBps: rate,
      notes: str(fd, 'notes'),
    }

    // The invoice number is unique; retry if two invoices are created at the same moment.
    for (let attempt = 0; attempt < 3 && !newId; attempt++) {
      const number = await nextInvoiceNumber()
      const [row] = await db
        .insert(invoices)
        .values({ ...values, number })
        .onConflictDoNothing()
        .returning({ id: invoices.id })
      if (row) newId = row.id
    }
    if (!newId) throw new ValidationError('Could not assign an invoice number — please try again.')
    await saveInvoiceItems(newId, items, rate)
    revalidateInvoice(newId, projectId)
  })
  if (result.error || !newId) return result
  redirect(`/admin/invoices/${newId}`)
}

// ---------- Edit ----------

export async function updateInvoiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('invoices:manage')
  let id = 0
  const result = await guard(async () => {
    const inv = await loadInvoice(fd)
    if (inv.status === 'paid' || inv.status === 'void') throw new ValidationError('Paid or void invoices can’t be edited.')
    const { issueDate, dueDate } = readDates(fd)
    const items = lineItems(fd)
    const rate = taxBps(fd)
    await db
      .update(invoices)
      .set({ issueDate, dueDate, notes: str(fd, 'notes'), kind: readKind(fd) })
      .where(eq(invoices.id, inv.id))
    await saveInvoiceItems(inv.id, items, rate)
    id = inv.id
    revalidateInvoice(inv.id, inv.projectId)
  })
  if (result.error || !id) return result
  redirect(`/admin/invoices/${id}`)
}

// ---------- Send ----------

export async function sendInvoiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('invoices:manage')
  return guard(async () => {
    const inv = await loadInvoice(fd)
    if (inv.status === 'void') throw new ValidationError('This invoice is void.')
    if (inv.totalCents <= 0) throw new ValidationError('Add line items before sending.')
    const viaSms = bool(fd, 'viaSms')
    const reminder = fd.get('mode') === 'reminder'
    const [customer] = await db.select().from(customers).where(eq(customers.id, inv.customerId))
    if (!customer.email && !(viaSms && customer.phone)) {
      throw new ValidationError(
        customer.phone
          ? 'This customer has no email on file — check “also text the customer” to send by text.'
          : 'This customer has no email or phone on file. Add one on the customer page first.',
      )
    }
    const results = await sendInvoice(inv.id, { viaSms, reminder })
    revalidateInvoice(inv.id, inv.projectId)
    const failed = results.filter((r) => r.includes('failed'))
    if (failed.length) return { error: `Problem sending: ${results.join(', ')}` }
    return { ok: true, message: `${reminder ? 'Reminder' : 'Invoice'} sent by ${results.join(' and ')}.` }
  })
}

// ---------- Payments ----------

export async function recordPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('payments:record')
  return guard(async () => {
    const inv = await loadInvoice(fd)
    if (inv.status === 'void') throw new ValidationError('This invoice is void.')
    const amountCents = parseDollars(str(fd, 'amount'))
    if (!amountCents || amountCents <= 0) throw new ValidationError('Enter the amount received.')
    const balance = balanceDue(inv)
    if (amountCents > balance) throw new ValidationError(`That’s more than the balance due (${formatCents(balance)}).`)
    const method = str(fd, 'method') ?? 'check'
    if (!(MANUAL_PAYMENT_METHODS as readonly string[]).includes(method)) throw new ValidationError('Pick a payment method.')
    const date = str(fd, 'date') ?? todayISO()
    if (!isValidISODate(date)) throw new ValidationError('Enter a valid date.')
    if (date > todayISO()) throw new ValidationError('Payment date can’t be in the future.')
    // Noon UTC keeps the calendar date stable in every US time zone.
    const receivedAt = date === todayISO() ? new Date() : new Date(`${date}T12:00:00Z`)

    await recordPayment({
      invoiceId: inv.id,
      amountCents,
      method: method as (typeof MANUAL_PAYMENT_METHODS)[number],
      reference: str(fd, 'reference')?.slice(0, 200) ?? null,
      recordedBy: user.id,
      receivedAt,
    })
    revalidateInvoice(inv.id, inv.projectId)
    return { ok: true, message: `Recorded ${formatCents(amountCents)} payment.` }
  })
}

export async function deletePaymentAction(fd: FormData): Promise<void> {
  await requireUser('payments:record')
  const paymentId = int(fd, 'paymentId')
  if (!paymentId) return
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId))
  // Online payments are the record of money actually moved by Stripe — refund those in Stripe instead.
  if (!p || p.method === 'stripe') return
  await db.delete(payments).where(eq(payments.id, paymentId))
  await refreshInvoiceStatus(p.invoiceId)
  const [inv] = await db.select({ projectId: invoices.projectId }).from(invoices).where(eq(invoices.id, p.invoiceId))
  revalidateInvoice(p.invoiceId, inv?.projectId)
}

// ---------- Void ----------

export async function voidInvoiceAction(fd: FormData): Promise<void> {
  await requireUser('invoices:manage')
  const id = int(fd, 'id')
  if (!id) return
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, id))
  if (!inv || inv.paidCents > 0 || inv.status === 'void') return
  await db.update(invoices).set({ status: 'void' }).where(eq(invoices.id, id))
  revalidateInvoice(id, inv.projectId)
}
