'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { customers, estimates, leads, type Lead } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { guard, str, type ActionState, ValidationError } from '@/lib/action-state'
import { toE164 } from '@/lib/utils'
import { LEAD_STATUSES } from '../_ops/constants'

type LeadStatus = (typeof LEAD_STATUSES)[number]

async function loadLead(id: number): Promise<Lead> {
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Lead not found.')
  const [lead] = await db.select().from(leads).where(eq(leads.id, id))
  if (!lead) throw new ValidationError('Lead not found.')
  return lead
}

function done(id: number) {
  revalidatePath('/admin/leads')
  revalidatePath(`/admin/leads/${id}`)
  revalidatePath('/admin')
}

export async function updateLeadStatus(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('leads:manage')
  return guard(async () => {
    const status = str(fd, 'status') as LeadStatus | null
    if (!status || !LEAD_STATUSES.includes(status)) throw new ValidationError('Pick a valid status.')
    await loadLead(id)
    await db.update(leads).set({ status }).where(eq(leads.id, id))
    done(id)
    return { ok: true, message: 'Status updated.' }
  })
}

export async function updateLeadNotes(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('leads:manage')
  return guard(async () => {
    await loadLead(id)
    await db.update(leads).set({ notes: str(fd, 'notes')?.slice(0, 5000) ?? null }).where(eq(leads.id, id))
    done(id)
    return { ok: true, message: 'Notes saved.' }
  })
}

/**
 * Links the lead to a customer: reuses an existing customer with the same email or phone,
 * otherwise creates one from the lead's info. Returns the customer id.
 */
async function ensureCustomer(lead: Lead): Promise<number> {
  if (lead.customerId) return lead.customerId

  const phoneDigits = toE164(lead.phone)?.slice(-10)
  const matches = []
  if (lead.email) matches.push(sql`lower(${customers.email}) = lower(${lead.email})`)
  if (phoneDigits) matches.push(sql`right(regexp_replace(coalesce(${customers.phone}, ''), '\\D', '', 'g'), 10) = ${phoneDigits}`)
  const [existing] = matches.length
    ? await db.select({ id: customers.id }).from(customers).where(or(...matches)).limit(1)
    : []

  const customerId =
    existing?.id ??
    (
      await db
        .insert(customers)
        .values({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          city: lead.city,
          source: lead.source ?? (lead.referredBy ? 'Referral' : 'Website'),
          notes: lead.referredBy ? `Referred by ${lead.referredBy}` : null,
        })
        .returning({ id: customers.id })
    )[0].id

  await db.update(leads).set({ customerId }).where(eq(leads.id, lead.id))
  return customerId
}

export async function convertLead(fd: FormData): Promise<void> {
  await requireUser('leads:manage')
  await requireUser('customers:manage')
  const id = Number(fd.get('id'))
  const lead = await loadLead(id)
  await ensureCustomer(lead)
  if (fd.get('markWon') === '1') await db.update(leads).set({ status: 'won' }).where(eq(leads.id, id))
  done(id)
  revalidatePath('/admin/customers')
}

export async function createEstimateFromLead(fd: FormData): Promise<void> {
  await requireUser('leads:manage')
  await requireUser('estimates:manage')
  const id = Number(fd.get('id'))
  const lead = await loadLead(id)
  const customerId = await ensureCustomer(lead)
  done(id)
  redirect(`/admin/estimates/new?customerId=${customerId}&leadId=${id}`)
}

/** Deletes spam / junk leads. Leads with estimates are kept (mark them Lost instead). */
export async function deleteLead(fd: FormData): Promise<void> {
  await requireUser('leads:manage')
  const id = Number(fd.get('id'))
  await loadLead(id)
  const [est] = await db.select({ id: estimates.id }).from(estimates).where(eq(estimates.leadId, id)).limit(1)
  if (est) throw new ValidationError('This lead has estimates — mark it Lost instead of deleting.')
  await db.delete(leads).where(eq(leads.id, id))
  revalidatePath('/admin/leads')
  revalidatePath('/admin')
  redirect('/admin/leads')
}
