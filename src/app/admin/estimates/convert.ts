import 'server-only'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { customers, estimates, projects, type Estimate } from '@/db/schema'

/**
 * Creates a pending job from an estimate (title, customer address, quoted = pre-tax subtotal)
 * and links it. Returns the existing job id if the estimate is already linked.
 */
export async function createProjectFromEstimate(est: Estimate): Promise<number> {
  if (est.projectId) return est.projectId
  const [customer] = await db.select().from(customers).where(eq(customers.id, est.customerId))
  return db.transaction(async (tx) => {
    // Re-check inside the transaction so a double click can't create two jobs.
    const [fresh] = await tx.select({ projectId: estimates.projectId }).from(estimates).where(eq(estimates.id, est.id))
    if (fresh?.projectId) return fresh.projectId
    const [p] = await tx
      .insert(projects)
      .values({
        customerId: est.customerId,
        title: est.title,
        description: est.notes,
        address: customer?.address ?? null,
        city: customer?.city ?? null,
        status: 'pending',
        quotedCents: est.subtotalCents,
      })
      .returning({ id: projects.id })
    await tx.update(estimates).set({ projectId: p.id }).where(and(eq(estimates.id, est.id), isNull(estimates.projectId)))
    return p.id
  })
}
