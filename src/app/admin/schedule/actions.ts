'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { scheduleBlocks, users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { guard, int, reqStr, str, type ActionState, ValidationError } from '@/lib/action-state'
import { isValidISODate } from '@/lib/dates'
import { BLOCK_KINDS } from '../_ops/constants'

function refresh() {
  revalidatePath('/admin/schedule')
  revalidatePath('/availability')
  revalidatePath('/')
}

export async function addBlock(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('schedule:manage')
  return guard(async () => {
    const title = reqStr(fd, 'title', 'Title').slice(0, 120)
    const kindRaw = str(fd, 'kind')
    const kind = BLOCK_KINDS.find((k) => k === kindRaw)
    if (!kind) throw new ValidationError('Pick a block type.')
    const startDate = str(fd, 'startDate')
    const endDate = str(fd, 'endDate') ?? startDate
    if (!startDate || !isValidISODate(startDate)) throw new ValidationError('Pick a start date.')
    if (!endDate || !isValidISODate(endDate)) throw new ValidationError('End date is invalid.')
    if (endDate < startDate) throw new ValidationError('End date can’t be before the start date.')

    const userId = int(fd, 'userId')
    if (userId) {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId))
      if (!u) throw new ValidationError('Team member not found.')
    }
    await db.insert(scheduleBlocks).values({
      title,
      kind,
      startDate,
      endDate,
      userId: userId ?? null,
      note: str(fd, 'note')?.slice(0, 500) ?? null,
    })
    refresh()
    return { ok: true, message: 'Added to the schedule.' }
  })
}

export async function deleteBlock(fd: FormData): Promise<void> {
  await requireUser('schedule:manage')
  const id = Number(fd.get('id'))
  if (!Number.isInteger(id) || id <= 0) return
  await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, id))
  refresh()
}
