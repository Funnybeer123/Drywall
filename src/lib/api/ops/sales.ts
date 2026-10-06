import 'server-only'
import { z } from 'zod'
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { customers, estimates, invoices, leads, projects } from '@/db/schema'
import { getSettings } from '@/lib/settings'
import { addDays, todayISO } from '@/lib/dates'
import { ensureCustomerForLead } from '@/lib/leads'
import { getEstimateWithItems, saveEstimateItems } from '@/lib/billing'
import { sendEstimate } from '@/lib/notify'
import { newToken } from '@/lib/utils'
import { createProjectFromEstimate } from '@/app/admin/estimates/convert'
import { badRequest, notFound, op } from '../framework'
import {
  customerOut,
  estimateOut,
  idParam,
  invoiceOut,
  itemsToCents,
  jobOut,
  leadOut,
  taxBpsFromPercent,
  toDollars,
  zDate,
  zId,
  zItems,
  zLimit,
  zText,
} from '../common'

const LEAD_STATUS = z.enum(['new', 'contacted', 'estimate_sent', 'won', 'lost'])

async function loadLead(id: number) {
  const [l] = await db.select().from(leads).where(eq(leads.id, id))
  if (!l) throw notFound('Lead')
  return l
}
async function loadCustomer(id: number) {
  const [c] = await db.select().from(customers).where(eq(customers.id, id))
  if (!c) throw notFound('Customer')
  return c
}
async function loadEstimate(id: number) {
  const data = await getEstimateWithItems({ id })
  if (!data) throw notFound('Estimate')
  return data
}

const customerFields = {
  name: zText(120).min(1),
  company: zText(120).optional(),
  email: z.email().optional(),
  phone: zText(40).optional(),
  address: zText(200).optional(),
  city: zText(100).optional(),
  state: zText(40).optional(),
  zip: zText(20).optional(),
  source: zText(80).optional().describe('How they found the business (Google, Referral, Facebook…)'),
  notes: zText(5000).optional(),
}

export const salesOps = [
  // ---------- Leads ----------
  op({
    id: 'list_leads',
    method: 'GET',
    path: '/leads',
    tag: 'Leads',
    scope: 'read',
    permission: 'leads:manage',
    summary: 'List quote requests (leads), newest first. Filter by status.',
    query: z.object({ status: LEAD_STATUS.optional(), limit: zLimit }),
    run: async ({ query }) => {
      const rows = await db
        .select()
        .from(leads)
        .where(query.status ? eq(leads.status, query.status) : undefined)
        .orderBy(desc(leads.createdAt))
        .limit(query.limit)
      return { leads: rows.map(leadOut) }
    },
  }),
  op({
    id: 'get_lead',
    method: 'GET',
    path: '/leads/{leadId}',
    tag: 'Leads',
    scope: 'read',
    permission: 'leads:manage',
    summary: 'Get one lead with all details and photo links.',
    params: idParam('leadId', 'Lead id'),
    run: async ({ params }) => ({ lead: leadOut(await loadLead(params.leadId)) }),
  }),
  op({
    id: 'create_lead',
    method: 'POST',
    path: '/leads',
    tag: 'Leads',
    scope: 'write',
    permission: 'leads:manage',
    summary: 'Log a new lead (e.g. someone who called, texted or stopped Willy on a job). Does not message anyone.',
    body: z.object({
      name: zText(120).min(1),
      phone: zText(40).min(7),
      email: z.email().optional(),
      address: zText(200).optional(),
      city: zText(100).optional(),
      jobType: zText(120).min(1).describe('e.g. Drywall repair, Hang & finish, Popcorn removal'),
      description: zText(5000).default(''),
      timeframe: zText(80).optional(),
      source: zText(80).optional().describe('Phone call, Referral, Facebook, Google…'),
      referredBy: zText(120).optional(),
      notes: zText(5000).optional(),
    }),
    run: async ({ body }) => {
      const [l] = await db.insert(leads).values(body).returning()
      return { lead: leadOut(l) }
    },
  }),
  op({
    id: 'update_lead',
    method: 'PATCH',
    path: '/leads/{leadId}',
    tag: 'Leads',
    scope: 'write',
    permission: 'leads:manage',
    summary: 'Update a lead’s status (new, contacted, estimate_sent, won, lost) and/or notes.',
    params: idParam('leadId', 'Lead id'),
    body: z.object({ status: LEAD_STATUS.optional(), notes: zText(5000).optional() }),
    run: async ({ params, body }) => {
      await loadLead(params.leadId)
      if (body.status === undefined && body.notes === undefined) throw badRequest('Nothing to update.')
      const [l] = await db.update(leads).set(body).where(eq(leads.id, params.leadId)).returning()
      return { lead: leadOut(l) }
    },
  }),
  op({
    id: 'convert_lead_to_customer',
    method: 'POST',
    path: '/leads/{leadId}/convert',
    tag: 'Leads',
    scope: 'write',
    permission: 'customers:manage',
    summary: 'Turn a lead into a customer (reuses an existing customer with the same phone/email). Returns the customer.',
    params: idParam('leadId', 'Lead id'),
    body: z.object({ markWon: z.boolean().default(false).describe('Also mark the lead as won') }),
    run: async ({ params, body }) => {
      const lead = await loadLead(params.leadId)
      const customerId = await ensureCustomerForLead(lead)
      if (body.markWon) await db.update(leads).set({ status: 'won' }).where(eq(leads.id, lead.id))
      return { customer: customerOut(await loadCustomer(customerId)), leadId: lead.id }
    },
  }),

  // ---------- Customers ----------
  op({
    id: 'list_customers',
    method: 'GET',
    path: '/customers',
    tag: 'Customers',
    scope: 'read',
    permission: 'customers:manage',
    summary: 'Search customers by name, company, email or phone.',
    query: z.object({ q: zText(100).optional().describe('Search text'), limit: zLimit }),
    run: async ({ query }) => {
      const q = query.q ? `%${query.q}%` : null
      const digits = query.q?.replace(/\D/g, '')
      const rows = await db
        .select()
        .from(customers)
        .where(
          q
            ? or(
                ilike(customers.name, q),
                ilike(customers.company, q),
                ilike(customers.email, q),
                digits && digits.length >= 4
                  ? sql`regexp_replace(coalesce(${customers.phone}, ''), '\\D', '', 'g') like ${'%' + digits + '%'}`
                  : undefined,
              )
            : undefined,
        )
        .orderBy(desc(customers.createdAt))
        .limit(query.limit)
      return { customers: rows.map(customerOut) }
    },
  }),
  op({
    id: 'get_customer',
    method: 'GET',
    path: '/customers/{customerId}',
    tag: 'Customers',
    scope: 'read',
    permission: 'customers:manage',
    summary: 'Get a customer with their jobs, estimates and invoices (with balances).',
    params: idParam('customerId', 'Customer id'),
    run: async ({ params }) => {
      const c = await loadCustomer(params.customerId)
      const today = todayISO()
      const [jobs, ests, invs] = await Promise.all([
        db.select().from(projects).where(eq(projects.customerId, c.id)).orderBy(desc(projects.createdAt)),
        db.select().from(estimates).where(eq(estimates.customerId, c.id)).orderBy(desc(estimates.createdAt)),
        db.select().from(invoices).where(eq(invoices.customerId, c.id)).orderBy(desc(invoices.createdAt)),
      ])
      return {
        customer: customerOut(c),
        jobs: jobs.map(jobOut),
        estimates: ests.map(estimateOut),
        invoices: invs.map((i) => invoiceOut(i, today)),
        lifetimePaid: toDollars(invs.reduce((s, i) => s + i.paidCents, 0)),
      }
    },
  }),
  op({
    id: 'create_customer',
    method: 'POST',
    path: '/customers',
    tag: 'Customers',
    scope: 'write',
    permission: 'customers:manage',
    summary: 'Add a customer. Search first with list_customers to avoid duplicates.',
    body: z.object(customerFields),
    run: async ({ body }) => {
      const [c] = await db.insert(customers).values(body).returning()
      return { customer: customerOut(c) }
    },
  }),
  op({
    id: 'update_customer',
    method: 'PATCH',
    path: '/customers/{customerId}',
    tag: 'Customers',
    scope: 'write',
    permission: 'customers:manage',
    summary: 'Update a customer’s contact details or notes. Only the fields you send are changed.',
    params: idParam('customerId', 'Customer id'),
    body: z.object(customerFields).partial(),
    run: async ({ params, body }) => {
      await loadCustomer(params.customerId)
      if (!Object.keys(body).length) throw badRequest('Nothing to update.')
      const [c] = await db.update(customers).set(body).where(eq(customers.id, params.customerId)).returning()
      return { customer: customerOut(c) }
    },
  }),

  // ---------- Estimates ----------
  op({
    id: 'list_estimates',
    method: 'GET',
    path: '/estimates',
    tag: 'Estimates',
    scope: 'read',
    permission: 'estimates:manage',
    summary: 'List estimates, newest first. Filter by status or customer.',
    query: z.object({
      status: z.enum(['draft', 'sent', 'accepted', 'declined']).optional(),
      customerId: zId.optional(),
      limit: zLimit,
    }),
    run: async ({ query }) => {
      const rows = await db
        .select()
        .from(estimates)
        .where(
          and(
            query.status ? eq(estimates.status, query.status) : undefined,
            query.customerId ? eq(estimates.customerId, query.customerId) : undefined,
          ),
        )
        .orderBy(desc(estimates.createdAt))
        .limit(query.limit)
      return { estimates: rows.map(estimateOut) }
    },
  }),
  op({
    id: 'get_estimate',
    method: 'GET',
    path: '/estimates/{estimateId}',
    tag: 'Estimates',
    scope: 'read',
    permission: 'estimates:manage',
    summary: 'Get an estimate with its line items.',
    params: idParam('estimateId', 'Estimate id'),
    run: async ({ params }) => {
      const { estimate, items } = await loadEstimate(params.estimateId)
      return {
        estimate: estimateOut(estimate),
        items: items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: toDollars(i.unitPriceCents) })),
      }
    },
  }),
  op({
    id: 'create_estimate',
    method: 'POST',
    path: '/estimates',
    tag: 'Estimates',
    scope: 'write',
    permission: 'estimates:manage',
    summary:
      'Create a draft estimate with line items for a customer. Use list_price_items for Willy’s standard prices. It is NOT sent until send_estimate is called.',
    body: z.object({
      customerId: zId,
      title: zText(200).min(1),
      items: zItems,
      taxRatePercent: z.number().min(0).max(50).optional().describe('Defaults to the business tax rate'),
      validUntil: zDate.optional().describe('Defaults to 30 days from today'),
      notes: zText(5000).optional().describe('Shown to the customer'),
      leadId: zId.optional().describe('Link to the lead this estimate came from'),
    }),
    run: async ({ body }) => {
      await loadCustomer(body.customerId)
      const s = await getSettings()
      const taxRateBps = taxBpsFromPercent(body.taxRatePercent, s.taxRateBps)
      const [e] = await db
        .insert(estimates)
        .values({
          customerId: body.customerId,
          leadId: body.leadId ?? null,
          title: body.title,
          notes: body.notes ?? null,
          token: newToken(),
          taxRateBps,
          validUntil: body.validUntil ?? addDays(todayISO(), 30),
        })
        .returning()
      await saveEstimateItems(e.id, itemsToCents(body.items), taxRateBps)
      return { estimate: estimateOut((await loadEstimate(e.id)).estimate) }
    },
  }),
  op({
    id: 'update_estimate',
    method: 'PATCH',
    path: '/estimates/{estimateId}',
    tag: 'Estimates',
    scope: 'write',
    permission: 'estimates:manage',
    summary: 'Edit a draft or sent estimate (title, notes, valid-until, tax, or replace all line items).',
    params: idParam('estimateId', 'Estimate id'),
    body: z.object({
      title: zText(200).min(1).optional(),
      notes: zText(5000).optional(),
      validUntil: zDate.optional(),
      taxRatePercent: z.number().min(0).max(50).optional(),
      items: zItems.optional().describe('Replaces ALL existing line items'),
    }),
    run: async ({ params, body }) => {
      const { estimate, items } = await loadEstimate(params.estimateId)
      if (estimate.status === 'accepted' || estimate.status === 'declined') {
        throw badRequest(`Estimate is ${estimate.status} and can’t be edited.`)
      }
      const { items: newItems, taxRatePercent, ...rest } = body
      if (Object.keys(rest).length) await db.update(estimates).set(rest).where(eq(estimates.id, params.estimateId))
      if (newItems || taxRatePercent !== undefined) {
        const taxRateBps = taxBpsFromPercent(taxRatePercent, estimate.taxRateBps)
        await saveEstimateItems(params.estimateId, newItems ? itemsToCents(newItems) : items, taxRateBps)
      }
      return { estimate: estimateOut((await loadEstimate(params.estimateId)).estimate) }
    },
  }),
  op({
    id: 'send_estimate',
    method: 'POST',
    path: '/estimates/{estimateId}/send',
    tag: 'Estimates',
    scope: 'send',
    permission: 'estimates:manage',
    summary: 'Email the estimate (PDF + accept-online link) to the customer, optionally also by text. Only do this when Willy says to send it.',
    params: idParam('estimateId', 'Estimate id'),
    body: z.object({ alsoText: z.boolean().default(false) }),
    run: async ({ params, body }) => {
      const { estimate } = await loadEstimate(params.estimateId)
      if (estimate.status === 'declined') throw badRequest('Estimate was declined.')
      const results = await sendEstimate(estimate.id, body.alsoText)
      if (!results.length) throw badRequest('Customer has no email or phone on file.')
      await db
        .update(estimates)
        .set({ status: estimate.status === 'draft' ? 'sent' : estimate.status, sentAt: new Date() })
        .where(eq(estimates.id, estimate.id))
      if (estimate.leadId) {
        await db
          .update(leads)
          .set({ status: 'estimate_sent' })
          .where(and(eq(leads.id, estimate.leadId), inArray(leads.status, ['new', 'contacted'])))
      }
      return { sent: results, estimate: estimateOut((await loadEstimate(estimate.id)).estimate) }
    },
  }),
  op({
    id: 'convert_estimate_to_job',
    method: 'POST',
    path: '/estimates/{estimateId}/job',
    tag: 'Estimates',
    scope: 'write',
    permission: 'jobs:manage',
    summary: 'Create a pending job from an estimate (or return the job it is already linked to).',
    params: idParam('estimateId', 'Estimate id'),
    run: async ({ params }) => {
      const { estimate } = await loadEstimate(params.estimateId)
      const jobId = await createProjectFromEstimate(estimate)
      const [p] = await db.select().from(projects).where(eq(projects.id, jobId))
      return { job: jobOut(p) }
    },
  }),
]
