import 'server-only'
import { z } from 'zod'
import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  customers,
  expenseCategoryEnum,
  expenses,
  invoices,
  laborEntries,
  payments,
  priceItems,
  projectAssignments,
  projects,
} from '@/db/schema'
import { getSettings } from '@/lib/settings'
import { addDays, todayISO } from '@/lib/dates'
import { can } from '@/lib/permissions'
import { balanceDue, getEstimateWithItems, getInvoiceWithItems, nextInvoiceNumber, recordPayment, saveInvoiceItems } from '@/lib/billing'
import { sendInvoice } from '@/lib/notify'
import { getProjectFinancials } from '@/lib/profit'
import { newToken } from '@/lib/utils'
import { EXPENSE_CATEGORY_LABELS } from '@/lib/expense-categories'
import { ApiError, badRequest, notFound, op } from '../framework'
import {
  expenseOut,
  idParam,
  invoiceOut,
  itemsToCents,
  saveBase64Upload,
  taxBpsFromPercent,
  toCents,
  toDollars,
  zDate,
  zAmount,
  zDollars,
  zId,
  zItems,
  zLimit,
  zText,
  zUpload,
} from '../common'

const CATEGORY = z
  .enum(expenseCategoryEnum.enumValues)
  .describe(
    'Expense category: ' +
      Object.entries(EXPENSE_CATEGORY_LABELS)
        .map(([k, v]) => `${k} (${v})`)
        .join(', '),
  )

async function loadInvoice(id: number) {
  const data = await getInvoiceWithItems({ id })
  if (!data) throw notFound('Invoice')
  return data
}

async function invoiceDetail(id: number) {
  const { invoice, items, payments: pays } = await loadInvoice(id)
  return {
    invoice: invoiceOut(invoice, todayISO()),
    items: items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: toDollars(i.unitPriceCents) })),
    payments: pays.map((p) => ({ id: p.id, amount: toDollars(p.amountCents), method: p.method, reference: p.reference, receivedAt: p.receivedAt })),
  }
}

export const moneyOps = [
  // ---------- Invoices ----------
  op({
    id: 'list_invoices',
    method: 'GET',
    path: '/invoices',
    tag: 'Invoices',
    scope: 'read',
    permission: 'invoices:manage',
    summary: 'List invoices, newest first. filter: draft, unpaid (sent or partly paid), overdue, paid, void.',
    query: z.object({
      filter: z.enum(['draft', 'unpaid', 'overdue', 'paid', 'void']).optional(),
      customerId: zId.optional(),
      jobId: zId.optional(),
      limit: zLimit,
    }),
    run: async ({ query }) => {
      const today = todayISO()
      const f = query.filter
      const rows = await db
        .select({ i: invoices, customerName: customers.name })
        .from(invoices)
        .innerJoin(customers, eq(customers.id, invoices.customerId))
        .where(
          and(
            f === 'unpaid' || f === 'overdue' ? inArray(invoices.status, ['sent', 'partial']) : f ? eq(invoices.status, f) : undefined,
            f === 'overdue' ? lt(invoices.dueDate, today) : undefined,
            query.customerId ? eq(invoices.customerId, query.customerId) : undefined,
            query.jobId ? eq(invoices.projectId, query.jobId) : undefined,
          ),
        )
        .orderBy(desc(invoices.createdAt))
        .limit(query.limit)
      return { invoices: rows.map((r) => ({ ...invoiceOut(r.i, today), customerName: r.customerName })) }
    },
  }),
  op({
    id: 'get_invoice',
    method: 'GET',
    path: '/invoices/{invoiceId}',
    tag: 'Invoices',
    scope: 'read',
    permission: 'invoices:manage',
    summary: 'Get an invoice with line items, payments, balance due and the customer pay link.',
    params: idParam('invoiceId', 'Invoice id'),
    run: async ({ params }) => invoiceDetail(params.invoiceId),
  }),
  op({
    id: 'create_invoice',
    method: 'POST',
    path: '/invoices',
    tag: 'Invoices',
    scope: 'write',
    permission: 'invoices:manage',
    summary:
      'Create a DRAFT invoice. Give items, or estimateId to copy an estimate’s items. For a deposit, use kind "deposit" with a single item for the deposit amount. Not sent until send_invoice is called.',
    body: z.object({
      customerId: zId.optional().describe('Required unless estimateId or jobId is given'),
      jobId: zId.optional(),
      estimateId: zId.optional().describe('Copy line items and tax from this estimate'),
      kind: z.enum(['standard', 'deposit', 'progress', 'final']).default('standard'),
      items: zItems.optional(),
      taxRatePercent: z.number().min(0).max(50).optional(),
      issueDate: zDate.optional().describe('Default today'),
      dueDate: zDate.optional().describe('Default today + payment terms'),
      notes: zText(5000).optional(),
    }),
    run: async ({ body }) => {
      const s = await getSettings()
      let customerId = body.customerId
      let projectId = body.jobId ?? null
      let items = body.items ? itemsToCents(body.items) : null
      let taxRateBps = taxBpsFromPercent(body.taxRatePercent, s.taxRateBps)

      if (body.estimateId) {
        const est = await getEstimateWithItems({ id: body.estimateId })
        if (!est) throw notFound('Estimate')
        customerId ??= est.estimate.customerId
        if (customerId !== est.estimate.customerId) throw badRequest('That estimate belongs to a different customer.')
        projectId ??= est.estimate.projectId
        items ??= est.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPriceCents: i.unitPriceCents }))
        if (body.taxRatePercent == null) taxRateBps = est.estimate.taxRateBps
      }
      if (projectId) {
        const [p] = await db.select().from(projects).where(eq(projects.id, projectId))
        if (!p) throw notFound('Job')
        customerId ??= p.customerId
        if (p.customerId !== customerId) throw badRequest('That job belongs to a different customer.')
      }
      if (!customerId) throw badRequest('Give customerId, jobId or estimateId.')
      const [c] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId))
      if (!c) throw notFound('Customer')
      if (!items?.length) throw badRequest('Give line items (or an estimateId to copy them from).')

      const issueDate = body.issueDate ?? todayISO()
      const dueDate = body.dueDate ?? addDays(issueDate, s.paymentTermsDays)
      if (dueDate < issueDate) throw badRequest('dueDate can’t be before issueDate.')

      let id = 0
      for (let attempt = 0; attempt < 3 && !id; attempt++) {
        const [row] = await db
          .insert(invoices)
          .values({
            number: await nextInvoiceNumber(),
            customerId,
            projectId,
            estimateId: body.estimateId ?? null,
            kind: body.kind,
            status: 'draft',
            token: newToken(),
            issueDate,
            dueDate,
            taxRateBps,
            notes: body.notes ?? null,
          })
          .onConflictDoNothing()
          .returning({ id: invoices.id })
        if (row) id = row.id
      }
      if (!id) throw new ApiError(409, 'conflict', 'Could not assign an invoice number — try again.')
      await saveInvoiceItems(id, items, taxRateBps)
      return invoiceDetail(id)
    },
  }),
  op({
    id: 'send_invoice',
    method: 'POST',
    path: '/invoices/{invoiceId}/send',
    tag: 'Invoices',
    scope: 'send',
    permission: 'invoices:manage',
    summary:
      'Email the invoice (PDF + pay-online link) to the customer, optionally also by text. Set reminder=true for a friendly overdue reminder. Only do this when Willy says to send it.',
    params: idParam('invoiceId', 'Invoice id'),
    body: z.object({ alsoText: z.boolean().default(false), reminder: z.boolean().default(false) }),
    run: async ({ params, body }) => {
      const { invoice } = await loadInvoice(params.invoiceId)
      if (invoice.status === 'void') throw badRequest('This invoice is void.')
      if (invoice.totalCents <= 0) throw badRequest('Invoice has no amount.')
      const [c] = await db.select().from(customers).where(eq(customers.id, invoice.customerId))
      if (!c.email && !(body.alsoText && c.phone)) throw badRequest('Customer has no email on file (set alsoText to text them instead).')
      const results = await sendInvoice(invoice.id, { viaSms: body.alsoText, reminder: body.reminder })
      return { sent: results, ...(await invoiceDetail(invoice.id)) }
    },
  }),
  op({
    id: 'record_payment',
    method: 'POST',
    path: '/invoices/{invoiceId}/payments',
    tag: 'Invoices',
    scope: 'write',
    permission: 'payments:record',
    summary: 'Record a payment received outside the website (cash, check, Zelle, Venmo…). Updates the balance and paid status.',
    params: idParam('invoiceId', 'Invoice id'),
    body: z.object({
      amount: zAmount.describe('Amount received in dollars'),
      method: z.enum(['cash', 'check', 'zelle', 'venmo', 'other']),
      reference: zText(200).optional().describe('Check number, confirmation code…'),
      date: zDate.optional().describe('Date received (default today)'),
    }),
    run: async ({ params, body, ctx }) => {
      const { invoice } = await loadInvoice(params.invoiceId)
      if (invoice.status === 'void') throw badRequest('This invoice is void.')
      const cents = toCents(body.amount)
      const balance = balanceDue(invoice)
      if (cents > balance) throw badRequest(`That’s more than the balance due ($${toDollars(balance).toFixed(2)}).`)
      const date = body.date ?? todayISO()
      if (date > todayISO()) throw badRequest('Payment date can’t be in the future.')
      await recordPayment({
        invoiceId: invoice.id,
        amountCents: cents,
        method: body.method,
        reference: body.reference ?? null,
        recordedBy: ctx.user.id,
        receivedAt: date === todayISO() ? new Date() : new Date(`${date}T12:00:00Z`),
      })
      return invoiceDetail(invoice.id)
    },
  }),
  op({
    id: 'void_invoice',
    method: 'POST',
    path: '/invoices/{invoiceId}/void',
    tag: 'Invoices',
    scope: 'write',
    permission: 'invoices:manage',
    summary: 'Void an invoice that has no payments (e.g. created by mistake).',
    params: idParam('invoiceId', 'Invoice id'),
    run: async ({ params }) => {
      const { invoice, payments: pays } = await loadInvoice(params.invoiceId)
      if (pays.length) throw badRequest('This invoice has payments recorded and can’t be voided.')
      await db.update(invoices).set({ status: 'void' }).where(eq(invoices.id, invoice.id))
      return invoiceDetail(invoice.id)
    },
  }),

  // ---------- Expenses ----------
  op({
    id: 'list_expenses',
    method: 'GET',
    path: '/expenses',
    tag: 'Expenses',
    scope: 'read',
    permission: 'expenses:add',
    summary: 'List expenses / supply purchases with totals. Filter by date range, job, category, or overhead only.',
    query: z.object({
      from: zDate.optional(),
      to: zDate.optional(),
      jobId: zId.optional(),
      category: CATEGORY.optional(),
      overheadOnly: z.coerce.boolean().optional().describe('Only expenses not tied to a job'),
      limit: z.coerce.number().int().min(1).max(500).default(100),
    }),
    run: async ({ query, ctx }) => {
      const mine = can(ctx.user, 'expenses:manage') ? undefined : eq(expenses.createdBy, ctx.user.id)
      const where = and(
        mine,
        query.from ? gte(expenses.date, query.from) : undefined,
        query.to ? lte(expenses.date, query.to) : undefined,
        query.jobId ? eq(expenses.projectId, query.jobId) : undefined,
        query.category ? eq(expenses.category, query.category) : undefined,
        query.overheadOnly ? isNull(expenses.projectId) : undefined,
      )
      const [rows, totals] = await Promise.all([
        db.select().from(expenses).where(where).orderBy(desc(expenses.date), desc(expenses.id)).limit(query.limit),
        db
          .select({ category: expenses.category, total: sql<number>`sum(${expenses.amountCents})::int` })
          .from(expenses)
          .where(where)
          .groupBy(expenses.category),
      ])
      return {
        expenses: rows.map(expenseOut),
        totalsByCategory: Object.fromEntries(totals.map((t) => [t.category, toDollars(t.total)])),
        total: toDollars(totals.reduce((s, t) => s + t.total, 0)),
      }
    },
  }),
  op({
    id: 'create_expense',
    method: 'POST',
    path: '/expenses',
    tag: 'Expenses',
    scope: 'write',
    permission: 'expenses:add',
    summary:
      'Log a supply purchase or business expense, optionally tied to a job (jobId) and with a receipt photo/PDF (base64). Leave jobId empty for overhead (tools, fuel, insurance…).',
    body: z.object({
      amount: zAmount.describe('Total paid in dollars'),
      category: CATEGORY,
      date: zDate.optional().describe('Default today'),
      vendor: zText(120).optional().describe('e.g. Home Depot, Menards, L&W Supply'),
      description: zText(500).optional(),
      jobId: zId.optional(),
      receipt: zUpload.optional(),
    }),
    run: async ({ body, ctx }) => {
      if (body.jobId) {
        const [p] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, body.jobId))
        if (!p) throw notFound('Job')
        if (!can(ctx.user, 'expenses:manage')) {
          const [a] = await db
            .select()
            .from(projectAssignments)
            .where(and(eq(projectAssignments.projectId, body.jobId), eq(projectAssignments.userId, ctx.user.id)))
          if (!a) throw notFound('Job')
        }
      } else if (!can(ctx.user, 'expenses:manage')) {
        throw badRequest('Crew members can only log expenses on their assigned jobs.')
      }
      const receiptUrl = body.receipt ? await saveBase64Upload(body.receipt, 'receipts') : null
      const [e] = await db
        .insert(expenses)
        .values({
          projectId: body.jobId ?? null,
          date: body.date ?? todayISO(),
          category: body.category,
          vendor: body.vendor ?? null,
          description: body.description ?? null,
          amountCents: toCents(body.amount),
          receiptUrl,
          createdBy: ctx.user.id,
        })
        .returning()
      return { expense: expenseOut(e) }
    },
  }),
  op({
    id: 'update_expense',
    method: 'PATCH',
    path: '/expenses/{expenseId}',
    tag: 'Expenses',
    scope: 'write',
    permission: 'expenses:manage',
    summary: 'Correct an expense (amount, category, date, vendor, description, job). jobId null = overhead.',
    params: idParam('expenseId', 'Expense id'),
    body: z.object({
      amount: zAmount.optional(),
      category: CATEGORY.optional(),
      date: zDate.optional(),
      vendor: zText(120).nullable().optional(),
      description: zText(500).nullable().optional(),
      jobId: zId.nullable().optional(),
    }),
    run: async ({ params, body }) => {
      const { amount, jobId, ...rest } = body
      if (!Object.keys(body).length) throw badRequest('Nothing to update.')
      const [e] = await db
        .update(expenses)
        .set({
          ...rest,
          ...(amount !== undefined ? { amountCents: toCents(amount) } : {}),
          ...(jobId !== undefined ? { projectId: jobId } : {}),
        })
        .where(eq(expenses.id, params.expenseId))
        .returning()
      if (!e) throw notFound('Expense')
      return { expense: expenseOut(e) }
    },
  }),
  op({
    id: 'delete_expense',
    method: 'DELETE',
    path: '/expenses/{expenseId}',
    tag: 'Expenses',
    scope: 'write',
    permission: 'expenses:manage',
    summary: 'Delete an expense entered by mistake (e.g. a duplicate).',
    params: idParam('expenseId', 'Expense id'),
    run: async ({ params }) => {
      const [e] = await db.delete(expenses).where(eq(expenses.id, params.expenseId)).returning()
      if (!e) throw notFound('Expense')
      return { deleted: expenseOut(e) }
    },
  }),

  // ---------- Price list ----------
  op({
    id: 'list_price_items',
    method: 'GET',
    path: '/price-items',
    tag: 'Price list',
    scope: 'read',
    permission: 'estimates:manage',
    summary: 'Willy’s standard prices (use these when building estimates and invoices).',
    run: async () => {
      const rows = await db.select().from(priceItems).orderBy(asc(priceItems.name))
      return { priceItems: rows.map((p) => ({ id: p.id, name: p.name, unit: p.unit, unitPrice: toDollars(p.unitPriceCents), active: p.active })) }
    },
  }),
  op({
    id: 'upsert_price_item',
    method: 'POST',
    path: '/price-items',
    tag: 'Price list',
    scope: 'write',
    permission: 'estimates:manage',
    summary: 'Add a standard price, or update one by passing its id.',
    body: z.object({
      priceItemId: zId.optional().describe('Pass to update an existing price item; omit to create'),
      name: zText(200).min(1),
      unit: zText(30).default('each').describe('each, sheet, sq ft, hour…'),
      unitPrice: zDollars,
      active: z.boolean().default(true),
    }),
    run: async ({ body }) => {
      const values = { name: body.name, unit: body.unit, unitPriceCents: toCents(body.unitPrice), active: body.active }
      const [row] = body.priceItemId
        ? await db.update(priceItems).set(values).where(eq(priceItems.id, body.priceItemId)).returning()
        : await db.insert(priceItems).values(values).returning()
      if (!row) throw notFound('Price item')
      return { priceItem: { id: row.id, name: row.name, unit: row.unit, unitPrice: toDollars(row.unitPriceCents), active: row.active } }
    },
  }),

  // ---------- Reports ----------
  op({
    id: 'get_profit_report',
    method: 'GET',
    path: '/reports/profit',
    tag: 'Reports',
    scope: 'read',
    permission: 'reports:view',
    summary:
      'Money report for a date range: cash collected, expenses by category, labor, net profit, and profit per job for jobs active in the range.',
    query: z.object({
      from: zDate.optional().describe('Default Jan 1 this year'),
      to: zDate.optional().describe('Default today'),
    }),
    run: async ({ query }) => {
      const today = todayISO()
      const from = query.from ?? today.slice(0, 5) + '01-01'
      const to = query.to ?? today
      const toExclusive = addDays(to, 1)
      const [collected, expRows, laborRow, jobs] = await Promise.all([
        db
          .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
          .from(payments)
          .where(and(gte(payments.receivedAt, new Date(`${from}T00:00:00Z`)), lt(payments.receivedAt, new Date(`${toExclusive}T00:00:00Z`)))),
        db
          .select({ category: expenses.category, total: sql<number>`sum(${expenses.amountCents})::int` })
          .from(expenses)
          .where(and(gte(expenses.date, from), lte(expenses.date, to)))
          .groupBy(expenses.category),
        db
          .select({ total: sql<number>`coalesce(sum(round(${laborEntries.hours} * ${laborEntries.rateCents})), 0)::int` })
          .from(laborEntries)
          .where(and(gte(laborEntries.date, from), lte(laborEntries.date, to))),
        db
          .select({ id: projects.id, title: projects.title, status: projects.status, customerName: customers.name })
          .from(projects)
          .innerJoin(customers, eq(customers.id, projects.customerId))
          .where(and(lte(projects.startDate, to), gte(sql`coalesce(${projects.endDate}, ${projects.startDate})`, from))),
      ])
      const fin = await getProjectFinancials(jobs.map((j) => j.id))
      const expenseTotal = expRows.reduce((s, r) => s + r.total, 0)
      const laborTotal = laborRow[0].total
      return {
        from,
        to,
        collected: toDollars(collected[0].total),
        expenses: toDollars(expenseTotal),
        expensesByCategory: Object.fromEntries(expRows.map((r) => [r.category, toDollars(r.total)])),
        labor: toDollars(laborTotal),
        netProfit: toDollars(collected[0].total - expenseTotal - laborTotal),
        jobs: jobs
          .map((j) => {
            const f = fin.get(j.id)!
            return {
              jobId: j.id,
              title: j.title,
              customer: j.customerName,
              status: j.status,
              revenue: toDollars(f.projected ? f.quotedCents : f.invoicedCents),
              revenueBasis: f.projected ? 'quote' : 'invoiced',
              costs: toDollars(f.costCents),
              profit: toDollars(f.profitCents),
              marginPercent: f.marginPct == null ? null : Math.round(f.marginPct * 10) / 10,
            }
          })
          .sort((a, b) => b.profit - a.profit),
      }
    },
  }),
]
