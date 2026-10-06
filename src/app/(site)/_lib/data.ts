import 'server-only'
import { cache } from 'react'
import { and, asc, eq, gte, inArray, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { faqs, galleryItems, projects, scheduleBlocks, serviceAreas, services, testimonials } from '@/db/schema'
import { computeAvailability, nextAvailable, parseWorkDays } from '@/lib/availability'
import { addDays, todayISO } from '@/lib/dates'
import { getSettings } from '@/lib/settings'

export const getServices = cache(() =>
  db.select().from(services).where(eq(services.published, true)).orderBy(asc(services.sort), asc(services.id)),
)

export const getServiceAreas = cache(() =>
  db
    .select()
    .from(serviceAreas)
    .where(eq(serviceAreas.published, true))
    .orderBy(asc(serviceAreas.id)),
)

export const getTestimonials = cache(() =>
  db
    .select()
    .from(testimonials)
    .where(eq(testimonials.published, true))
    .orderBy(asc(testimonials.sort), asc(testimonials.id)),
)

export const getGallery = cache(() =>
  db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.published, true))
    .orderBy(asc(galleryItems.sort), asc(galleryItems.id)),
)

export const getFaqs = cache(() => db.select().from(faqs).orderBy(asc(faqs.sort), asc(faqs.id)))

export type Rating = { count: number; average: number }

export const getRating = cache(async (): Promise<Rating> => {
  const rows = await getTestimonials()
  if (rows.length === 0) return { count: 0, average: 0 }
  const sum = rows.reduce((acc, t) => acc + Math.min(5, Math.max(1, t.rating)), 0)
  return { count: rows.length, average: Math.round((sum / rows.length) * 10) / 10 }
})

/** Public availability (no customer details) for `days` days starting at `from`. */
export async function getAvailability(from: string, days: number) {
  const to = addDays(from, days - 1)
  const [s, jobs, blocks] = await Promise.all([
    getSettings(),
    db
      .select({ startDate: projects.startDate, endDate: projects.endDate, status: projects.status })
      .from(projects)
      .where(inArray(projects.status, ['scheduled', 'in_progress'])),
    db
      .select({ startDate: scheduleBlocks.startDate, endDate: scheduleBlocks.endDate, userId: scheduleBlocks.userId })
      .from(scheduleBlocks)
      .where(and(isNull(scheduleBlocks.userId), gte(scheduleBlocks.endDate, from))),
  ])
  return computeAvailability({
    from,
    days,
    capacity: s.dailyCapacity,
    workDays: parseWorkDays(s.workDays),
    jobs: jobs.filter((j) => j.startDate && j.startDate <= to && (j.endDate ?? j.startDate) >= from),
    blocks,
  })
}

/** Earliest open/limited work day, starting tomorrow (a same-day start isn't realistic). */
export const getNextAvailable = cache(async (): Promise<string | null> => {
  const days = await getAvailability(addDays(todayISO(), 1), 120)
  return nextAvailable(days)
})
