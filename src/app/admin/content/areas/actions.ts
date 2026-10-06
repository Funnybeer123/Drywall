'use server'

import { redirect } from 'next/navigation'
import { and, eq, ne, not } from 'drizzle-orm'
import { db } from '@/db'
import { serviceAreas } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { bool, guard, int, reqStr, str, ValidationError, type ActionState } from '@/lib/action-state'
import { slugify } from '@/lib/utils'
import { clip, revalidateContent } from '../lib'

export async function saveAreaAction(id: number | null, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('content:manage')
  return guard(async () => {
    const city = reqStr(fd, 'city', 'City').slice(0, 120)
    const state = reqStr(fd, 'state', 'State').toUpperCase().slice(0, 20)
    const slug = slugify(`${city}-${state}`).slice(0, 120)
    if (!slug) throw new ValidationError('Enter a city name.')

    const [clash] = await db
      .select({ id: serviceAreas.id })
      .from(serviceAreas)
      .where(id == null ? eq(serviceAreas.slug, slug) : and(eq(serviceAreas.slug, slug), ne(serviceAreas.id, id)))
    if (clash) throw new ValidationError(`${city}, ${state} is already on your list.`)

    const values = { city, state, slug, blurb: clip(str(fd, 'blurb'), 3000), published: bool(fd, 'published') }
    if (id == null) {
      await db.insert(serviceAreas).values(values)
    } else {
      const updated = await db.update(serviceAreas).set(values).where(eq(serviceAreas.id, id)).returning({ id: serviceAreas.id })
      if (!updated.length) throw new ValidationError('This service area was deleted.')
    }
    revalidateContent()
    redirect('/admin/content/areas')
  })
}

export async function toggleAreaAction(fd: FormData): Promise<void> {
  await requireUser('content:manage')
  const id = int(fd, 'id')
  if (id) await db.update(serviceAreas).set({ published: not(serviceAreas.published) }).where(eq(serviceAreas.id, id))
  revalidateContent()
}

export async function deleteAreaAction(fd: FormData): Promise<void> {
  await requireUser('content:manage')
  const id = int(fd, 'id')
  if (id) await db.delete(serviceAreas).where(eq(serviceAreas.id, id))
  revalidateContent()
  redirect('/admin/content/areas')
}
