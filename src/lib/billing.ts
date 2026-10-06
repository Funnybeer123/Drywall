import 'server-only'
import { and, asc, eq, max, sql } from 'drizzle-orm'
import { db } from '@/db'
import { estimateItems, estimates, invoiceItems, invoices, payments } from '@/db/schema'
import { computeTotals, type LineItem } from './money'

type PaymentMethod = (typeof payments.$inferInsert)['method']

export async function nextInvoiceNumber(): Promise<number> {
  const [row] = await db.select({ n: max(invoices.number) }).from(invoices)
  return Math.max(1000, (row?.n ?? 1000) + 1)
}

/** Replace an invoice's line items and recompute stored totals/status. */
export async function saveInvoiceItems(invoiceId: number, items: LineItem[], taxRateBps: number) {
  const totals = computeTotals(items, taxRateBps)
  await db.transaction(async (tx) => {
    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId))
    if (items.length) {
      await tx.insert(invoiceItems).values(items.map((it, i) => ({ ...it, invoiceId, sort: i })))
    }
    await tx.update(invoices).set({ ...totals, taxRateBps }).where(eq(invoices.id, invoiceId))
  })
  await refreshInvoiceStatus(invoiceId)
  return totals
}

export async function saveEstimateItems(estimateId: number, items: LineItem[], taxRateBps: number) {
  const totals = computeTotals(items, taxRateBps)
  await db.transaction(async (tx) => {
    await tx.delete(estimateItems).where(eq(estimateItems.estimateId, estimateId))
    if (items.length) {
      await tx.insert(estimateItems).values(items.map((it, i) => ({ ...it, estimateId, sort: i })))
    }
    await tx.update(estimates).set({ ...totals, taxRateBps }).where(eq(estimates.id, estimateId))
  })
  return totals
}

/** Recompute paidCents from payments and derive status (never un-voids or un-drafts). */
export async function refreshInvoiceStatus(invoiceId: number) {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId))
  if (!inv) return
  const [{ paid }] = await db
    .select({ paid: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))

  let status = inv.status
  if (inv.status !== 'void' && inv.status !== 'draft') {
    status = paid >= inv.totalCents && inv.totalCents > 0 ? 'paid' : paid > 0 ? 'partial' : 'sent'
  } else if (inv.status === 'draft' && paid > 0) {
    status = paid >= inv.totalCents ? 'paid' : 'partial'
  }
  await db
    .update(invoices)
    .set({ paidCents: paid, status, paidAt: status === 'paid' ? (inv.paidAt ?? new Date()) : null })
    .where(eq(invoices.id, invoiceId))
  return { paid, status }
}

export async function recordPayment(input: {
  invoiceId: number
  amountCents: number
  method: PaymentMethod
  reference?: string | null
  stripeRef?: string | null
  recordedBy?: number | null
  receivedAt?: Date
}) {
  if (input.stripeRef) {
    // Webhooks can be delivered more than once — only record each Stripe payment once.
    const [existing] = await db.select({ id: payments.id }).from(payments).where(eq(payments.stripeRef, input.stripeRef))
    if (existing) return refreshInvoiceStatus(input.invoiceId)
  }
  await db
    .insert(payments)
    .values({
      invoiceId: input.invoiceId,
      amountCents: input.amountCents,
      method: input.method,
      reference: input.reference ?? null,
      stripeRef: input.stripeRef ?? null,
      recordedBy: input.recordedBy ?? null,
      receivedAt: input.receivedAt ?? new Date(),
    })
    .onConflictDoNothing()
  return refreshInvoiceStatus(input.invoiceId)
}

export async function getInvoiceWithItems(where: { id: number } | { token: string }) {
  const [inv] = await db
    .select()
    .from(invoices)
    .where('id' in where ? eq(invoices.id, where.id) : eq(invoices.token, where.token))
  if (!inv) return null
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id)).orderBy(asc(invoiceItems.sort))
  const pays = await db.select().from(payments).where(eq(payments.invoiceId, inv.id)).orderBy(asc(payments.receivedAt))
  return { invoice: inv, items, payments: pays }
}

export async function getEstimateWithItems(where: { id: number } | { token: string }) {
  const [est] = await db
    .select()
    .from(estimates)
    .where('id' in where ? eq(estimates.id, where.id) : eq(estimates.token, where.token))
  if (!est) return null
  const items = await db
    .select()
    .from(estimateItems)
    .where(and(eq(estimateItems.estimateId, est.id)))
    .orderBy(asc(estimateItems.sort))
  return { estimate: est, items }
}

export function balanceDue(inv: { totalCents: number; paidCents: number }) {
  return Math.max(0, inv.totalCents - inv.paidCents)
}
