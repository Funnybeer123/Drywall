import type { MetadataRoute } from 'next'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { serviceAreas } from '@/db/schema'
import { appUrl } from '@/lib/settings'

// Service areas are managed from the dashboard, so build the sitemap per request.
export const dynamic = 'force-dynamic'

const STATIC_PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/services', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/quote', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/work', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/reviews', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/availability', priority: 0.7, changeFrequency: 'daily' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const areas = await db
    .select({ slug: serviceAreas.slug })
    .from(serviceAreas)
    .where(eq(serviceAreas.published, true))
    .orderBy(asc(serviceAreas.id))

  return [
    ...STATIC_PAGES.map((p) => ({
      url: appUrl(p.path),
      lastModified: now,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...areas.map((a) => ({
      url: appUrl(`/areas/${a.slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
