'use server'

import { redirect } from 'next/navigation'
import { and, eq, ne, not } from 'drizzle-orm'
import { db } from '@/db'
import { services } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { bool, guard, int, reqStr, str, ValidationError, type ActionState } from '@/lib/action-state'
import { slugify } from '@/lib/utils'
import { revalidateContent, sortValue } from '../lib'
import { SERVICE_ICONS } from '../constants'

export async function saveServiceAction(id: number | null, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('content:manage')
  return guard(async () => {
    const name = reqStr(fd, 'name', 'Service name').slice(0, 120)
    const slug = slugify(str(fd, 'slug') ?? name).slice(0, 80)
    if (!slug) throw new ValidationError('Service name needs at least one letter or number.')
    const icon = str(fd, 'icon') ?? 'hammer'
    if (!(icon in SERVICE_ICONS)) throw new ValidationError('Choose an icon from the list.')

    const [clash] = await db
      .select({ id: services.id })
      .from(services)
      .where(id == null ? eq(services.slug, slug) : and(eq(services.slug, slug), ne(services.id, id)))
    if (clash) throw new ValidationError(`Another service already uses the web address “${slug}”. Change the name or URL slug.`)

    const values = {
      name,
      slug,
      icon,
      summary: reqStr(fd, 'summary', 'Short summary').slice(0, 300),
      body: (str(fd, 'body') ?? '').slice(0, 10_000),
      sort: sortValue(fd),
      published: bool(fd, 'published'),
    }
    if (id == null) {
      await db.insert(services).values(values)
    } else {
      const updated = await db.update(services).set(values).where(eq(services.id, id)).returning({ id: services.id })
      if (!updated.length) throw new ValidationError('This service was deleted.')
    }
    revalidateContent()
    redirect('/admin/content/services')
  })
}

export async function toggleServiceAction(fd: FormData): Promise<void> {
  await requireUser('content:manage')
  const id = int(fd, 'id')
  if (id) await db.update(services).set({ published: not(services.published) }).where(eq(services.id, id))
  revalidateContent()
}

export async function deleteServiceAction(fd: FormData): Promise<void> {
  await requireUser('content:manage')
  const id = int(fd, 'id')
  if (id) await db.delete(services).where(eq(services.id, id))
  revalidateContent()
  redirect('/admin/content/services')
}
