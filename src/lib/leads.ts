import 'server-only'
import { eq, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { customers, leads, type Lead } from '@/db/schema'
import { toE164 } from './utils'

/**
 * Links the lead to a customer: reuses an existing customer with the same email or phone,
 * otherwise creates one from the lead's info. Returns the customer id.
 */
export async function ensureCustomerForLead(lead: Lead): Promise<number> {
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
