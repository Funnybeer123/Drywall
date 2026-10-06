'use server'

import { redirect } from 'next/navigation'
import { eq, not } from 'drizzle-orm'
import { db } from '@/db'
import { galleryItems } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { bool, guard, int, reqStr, str, ValidationError, type ActionState } from '@/lib/action-state'
import { clip, revalidateContent, sortValue, websiteImage } from '../lib'

export async function saveGalleryAction(id: number | null, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('content:manage')
  return guard(async () => {
    const title = reqStr(fd, 'title', 'Title').slice(0, 160)
    const category = reqStr(fd, 'category', 'Category').slice(0, 60)
    const description = clip(str(fd, 'description'), 2000)
    const featured = bool(fd, 'featured')
    const published = bool(fd, 'published')
    const sort = sortValue(fd)

    if (id == null) {
      const imageUrl = await websiteImage(fd, 'image')
      if (!imageUrl) throw new ValidationError('Add an “after” photo — that’s the main picture people see.')
      const beforeImageUrl = await websiteImage(fd, 'beforeImage')
      await db.insert(galleryItems).values({ title, category, description, imageUrl, beforeImageUrl, featured, published, sort })
    } else {
      const [existing] = await db.select({ id: galleryItems.id }).from(galleryItems).where(eq(galleryItems.id, id))
      if (!existing) throw new ValidationError('This photo was deleted.')
      const imageUrl = await websiteImage(fd, 'image')
      const beforeImageUrl = await websiteImage(fd, 'beforeImage')
      await db
        .update(galleryItems)
        .set({
          title,
          category,
          description,
          featured,
          published,
          sort,
          ...(imageUrl ? { imageUrl } : {}),
          ...(beforeImageUrl ? { beforeImageUrl } : bool(fd, 'removeBefore') ? { beforeImageUrl: null } : {}),
        })
        .where(eq(galleryItems.id, id))
    }
    revalidateContent()
    redirect('/admin/content/gallery')
  })
}

export async function toggleGalleryAction(fd: FormData): Promise<void> {
  await requireUser('content:manage')
  const id = int(fd, 'id')
  const field = fd.get('field')
  if (!id) return
  if (field === 'featured') {
    await db.update(galleryItems).set({ featured: not(galleryItems.featured) }).where(eq(galleryItems.id, id))
  } else if (field === 'published') {
    await db.update(galleryItems).set({ published: not(galleryItems.published) }).where(eq(galleryItems.id, id))
  }
  revalidateContent()
}

export async function deleteGalleryAction(fd: FormData): Promise<void> {
  await requireUser('content:manage')
  const id = int(fd, 'id')
  if (id) await db.delete(galleryItems).where(eq(galleryItems.id, id))
  revalidateContent()
  redirect('/admin/content/gallery')
}
