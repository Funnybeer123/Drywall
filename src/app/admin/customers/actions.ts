'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { customers, estimates, invoices, leads, projects } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { guard, reqStr, str, type ActionState, ValidationError } from '@/lib/action-state'

function readCustomer(fd: FormData) {
  const email = str(fd, 'email')?.toLowerCase() ?? null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('That email address doesn’t look right.')
  const clip = (v: string | null, n = 200) => (v ? v.slice(0, n) : null)
  return {
    name: reqStr(fd, 'name', 'Name').slice(0, 200),
    company: clip(str(fd, 'company')),
    email,
    phone: clip(str(fd, 'phone'), 40),
    address: clip(str(fd, 'address')),
    city: clip(str(fd, 'city'), 100),
    state: clip(str(fd, 'state'), 40),
    zip: clip(str(fd, 'zip'), 20),
    source: clip(str(fd, 'source'), 100),
    notes: clip(str(fd, 'notes'), 5000),
  }
}

export async function createCustomer(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('customers:manage')
  let id = 0
  const res = await guard(async () => {
    const [row] = await db.insert(customers).values(readCustomer(fd)).returning({ id: customers.id })
    id = row.id
  })
  if (res.error) return res
  revalidatePath('/admin/customers')
  redirect(`/admin/customers/${id}`)
}

export async function updateCustomer(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('customers:manage')
  return guard(async () => {
    const [row] = await db.update(customers).set(readCustomer(fd)).where(eq(customers.id, id)).returning({ id: customers.id })
    if (!row) throw new ValidationError('Customer not found.')
    revalidatePath('/admin/customers')
    revalidatePath(`/admin/customers/${id}`)
    return { ok: true, message: 'Customer saved.' }
  })
}

async function relatedCounts(customerId: number) {
  const count = sql<number>`count(*)::int`
  const [[p], [e], [i]] = await Promise.all([
    db.select({ n: count }).from(projects).where(eq(projects.customerId, customerId)),
    db.select({ n: count }).from(estimates).where(eq(estimates.customerId, customerId)),
    db.select({ n: count }).from(invoices).where(eq(invoices.customerId, customerId)),
  ])
  return { projects: p.n, estimates: e.n, invoices: i.n, total: p.n + e.n + i.n }
}

/** Only customers with no jobs, estimates or invoices can be deleted. Linked leads are unlinked. */
export async function deleteCustomer(fd: FormData): Promise<void> {
  await requireUser('customers:manage')
  const id = Number(fd.get('id'))
  if (!Number.isInteger(id) || id <= 0) return
  const related = await relatedCounts(id)
  if (related.total > 0) throw new ValidationError('This customer has jobs, estimates or invoices and can’t be deleted.')
  await db.transaction(async (tx) => {
    await tx.update(leads).set({ customerId: null }).where(eq(leads.customerId, id))
    await tx.delete(customers).where(eq(customers.id, id))
  })
  revalidatePath('/admin/customers')
  redirect('/admin/customers')
}
