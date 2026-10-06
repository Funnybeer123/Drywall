'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { priceItems } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { bool, guard, reqStr, str, type ActionState, ValidationError } from '@/lib/action-state'
import { parseDollars } from '@/lib/money'

function readItem(fd: FormData) {
  const price = parseDollars(str(fd, 'price'))
  if (price == null || price < 0) throw new ValidationError('Enter a price in dollars.')
  return {
    name: reqStr(fd, 'name', 'Name').slice(0, 200),
    unit: (str(fd, 'unit') ?? 'each').slice(0, 30),
    unitPriceCents: price,
  }
}

function refresh() {
  revalidatePath('/admin/price-list')
  revalidatePath('/admin/estimates', 'layout')
  revalidatePath('/admin/invoices', 'layout')
}

export async function createPriceItem(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('estimates:manage')
  return guard(async () => {
    await db.insert(priceItems).values({ ...readItem(fd), active: true })
    refresh()
    return { ok: true, message: 'Added to your price list.' }
  })
}

export async function updatePriceItem(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('estimates:manage')
  return guard(async () => {
    const [row] = await db
      .update(priceItems)
      .set({ ...readItem(fd), active: bool(fd, 'active') })
      .where(eq(priceItems.id, id))
      .returning({ id: priceItems.id })
    if (!row) throw new ValidationError('Item not found.')
    refresh()
    return { ok: true, message: 'Saved.' }
  })
}

/** Line items copy the description and price, so deleting a price item never changes old estimates/invoices. */
export async function deletePriceItem(fd: FormData): Promise<void> {
  await requireUser('estimates:manage')
  const id = Number(fd.get('id'))
  if (!Number.isInteger(id) || id <= 0) return
  await db.delete(priceItems).where(eq(priceItems.id, id))
  refresh()
}
