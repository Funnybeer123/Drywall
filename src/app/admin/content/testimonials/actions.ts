'use server'

import { redirect } from 'next/navigation'
import { eq, like, not } from 'drizzle-orm'
import { db } from '@/db'
import { testimonials } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { bool, guard, int, reqStr, str, ValidationError, type ActionState } from '@/lib/action-state'
import { clip, revalidateContent, sortValue } from '../lib'
import { SAMPLE_TESTIMONIAL_PREFIX } from '../constants'

export async function saveTestimonialAction(id: number | null, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('content:manage')
  return guard(async () => {
    const rating = int(fd, 'rating')
    if (rating == null || rating < 1 || rating > 5) throw new ValidationError('Rating must be 1 to 5 stars.')
    const values = {
      customerName: reqStr(fd, 'customerName', 'Customer name').slice(0, 120),
      location: clip(str(fd, 'location'), 120),
      rating,
      quote: reqStr(fd, 'quote', 'Review text').slice(0, 3000),
      projectType: clip(str(fd, 'projectType'), 120),
      featured: bool(fd, 'featured'),
      published: bool(fd, 'published'),
      sort: sortValue(fd),
    }
    if (id == null) {
      await db.insert(testimonials).values(values)
    } else {
      const updated = await db.update(testimonials).set(values).where(eq(testimonials.id, id)).returning({ id: testimonials.id })
      if (!updated.length) throw new ValidationError('This review was deleted.')
    }
    revalidateContent()
    redirect('/admin/content/testimonials')
  })
}

export async function toggleTestimonialAction(fd: FormData): Promise<void> {
  await requireUser('content:manage')
  const id = int(fd, 'id')
  const field = fd.get('field')
  if (!id) return
  if (field === 'featured') {
    await db.update(testimonials).set({ featured: not(testimonials.featured) }).where(eq(testimonials.id, id))
  } else if (field === 'published') {
    await db.update(testimonials).set({ published: not(testimonials.published) }).where(eq(testimonials.id, id))
  }
  revalidateContent()
}

export async function deleteTestimonialAction(fd: FormData): Promise<void> {
  await requireUser('content:manage')
  const id = int(fd, 'id')
  if (id) await db.delete(testimonials).where(eq(testimonials.id, id))
  revalidateContent()
  redirect('/admin/content/testimonials')
}

export async function deleteSampleTestimonialsAction(): Promise<void> {
  await requireUser('content:manage')
  await db.delete(testimonials).where(like(testimonials.customerName, `${SAMPLE_TESTIMONIAL_PREFIX}%`))
  revalidateContent()
  redirect('/admin/content/testimonials')
}
