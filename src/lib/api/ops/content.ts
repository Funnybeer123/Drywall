import 'server-only'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { faqs, galleryItems, serviceAreas, services, settings, testimonials } from '@/db/schema'
import { getSettings } from '@/lib/settings'
import { slugify } from '@/lib/utils'
import { badRequest, notFound, op } from '../framework'
import { absolute, idParam, saveBase64Upload, zId, zText, zUpload } from '../common'

/** Public pages read content live, but refresh any cached render after edits. */
const refreshSite = () => revalidatePath('/', 'layout')

const ICONS = z.enum(['layers', 'wrench', 'sparkles', 'home', 'droplets', 'building', 'hammer', 'paintbrush', 'ruler'])

const galleryOut = (g: typeof galleryItems.$inferSelect) => ({
  ...g,
  imageUrl: absolute(g.imageUrl),
  beforeImageUrl: absolute(g.beforeImageUrl),
})

export const contentOps = [
  // ---------- Reviews ----------
  op({
    id: 'list_testimonials',
    method: 'GET',
    path: '/content/testimonials',
    tag: 'Website content',
    scope: 'read',
    permission: 'content:manage',
    summary: 'List customer reviews shown on the website.',
    run: async () => ({ testimonials: await db.select().from(testimonials).orderBy(asc(testimonials.sort), asc(testimonials.id)) }),
  }),
  op({
    id: 'upsert_testimonial',
    method: 'POST',
    path: '/content/testimonials',
    tag: 'Website content',
    scope: 'content',
    permission: 'content:manage',
    summary:
      'Add a customer review to the website, or update one by id. Only add REAL reviews from real customers, worded as they gave them.',
    body: z.object({
      testimonialId: zId.optional().describe('Pass to update an existing testimonial; omit to create'),
      customerName: zText(120).min(1).describe('e.g. "Jennifer R."'),
      location: zText(80).optional(),
      rating: z.number().int().min(1).max(5).default(5),
      quote: zText(2000).min(1),
      projectType: zText(120).optional(),
      featured: z.boolean().default(false).describe('Show on the home page'),
      published: z.boolean().default(true),
      sort: z.number().int().default(0),
    }),
    run: async ({ body }) => {
      const { testimonialId: id, ...values } = body
      const [row] = id
        ? await db.update(testimonials).set(values).where(eq(testimonials.id, id)).returning()
        : await db.insert(testimonials).values(values).returning()
      if (!row) throw notFound('Testimonial')
      refreshSite()
      return { testimonial: row }
    },
  }),
  op({
    id: 'delete_testimonial',
    method: 'DELETE',
    path: '/content/testimonials/{testimonialId}',
    tag: 'Website content',
    scope: 'content',
    permission: 'content:manage',
    summary: 'Remove a review from the website.',
    params: idParam('testimonialId', 'Testimonial id'),
    run: async ({ params }) => {
      const [row] = await db.delete(testimonials).where(eq(testimonials.id, params.testimonialId)).returning()
      if (!row) throw notFound('Testimonial')
      refreshSite()
      return { deleted: row.id }
    },
  }),

  // ---------- Gallery ----------
  op({
    id: 'list_gallery',
    method: 'GET',
    path: '/content/gallery',
    tag: 'Website content',
    scope: 'read',
    permission: 'content:manage',
    summary: 'List portfolio photos on the "Our Work" page.',
    run: async () => ({
      gallery: (await db.select().from(galleryItems).orderBy(asc(galleryItems.sort), asc(galleryItems.id))).map(galleryOut),
    }),
  }),
  op({
    id: 'add_gallery_item',
    method: 'POST',
    path: '/content/gallery',
    tag: 'Website content',
    scope: 'content',
    permission: 'content:manage',
    summary: 'Add a job photo to the portfolio (base64 image). Optionally include a "before" photo for a before/after slider.',
    body: z.object({
      title: zText(160).min(1),
      category: zText(60).min(1).describe('Hang & Finish, Repairs, Textures, Ceilings, Water Damage, Commercial…'),
      description: zText(1000).optional(),
      image: zUpload.describe('The finished ("after") photo'),
      beforeImage: zUpload.optional(),
      featured: z.boolean().default(false).describe('Show on the home page'),
      published: z.boolean().default(true),
      sort: z.number().int().default(0),
    }),
    run: async ({ body }) => {
      for (const u of [body.image, body.beforeImage]) {
        if (u && !/^image\/(jpeg|png|webp)$/.test(u.contentType)) throw badRequest('Gallery photos must be JPG, PNG or WebP.')
      }
      const imageUrl = await saveBase64Upload(body.image, 'gallery')
      const beforeImageUrl = body.beforeImage ? await saveBase64Upload(body.beforeImage, 'gallery') : null
      const { image: _i, beforeImage: _b, ...rest } = body
      void _i
      void _b
      const [row] = await db.insert(galleryItems).values({ ...rest, imageUrl, beforeImageUrl }).returning()
      refreshSite()
      return { item: galleryOut(row) }
    },
  }),
  op({
    id: 'update_gallery_item',
    method: 'PATCH',
    path: '/content/gallery/{galleryItemId}',
    tag: 'Website content',
    scope: 'content',
    permission: 'content:manage',
    summary: 'Edit a portfolio item’s title, category, description, featured/published flags or order.',
    params: idParam('galleryItemId', 'Gallery item id'),
    body: z.object({
      title: zText(160).min(1).optional(),
      category: zText(60).min(1).optional(),
      description: zText(1000).nullable().optional(),
      featured: z.boolean().optional(),
      published: z.boolean().optional(),
      sort: z.number().int().optional(),
    }),
    run: async ({ params, body }) => {
      if (!Object.keys(body).length) throw badRequest('Nothing to update.')
      const [row] = await db.update(galleryItems).set(body).where(eq(galleryItems.id, params.galleryItemId)).returning()
      if (!row) throw notFound('Gallery item')
      refreshSite()
      return { item: galleryOut(row) }
    },
  }),
  op({
    id: 'delete_gallery_item',
    method: 'DELETE',
    path: '/content/gallery/{galleryItemId}',
    tag: 'Website content',
    scope: 'content',
    permission: 'content:manage',
    summary: 'Remove a photo from the portfolio.',
    params: idParam('galleryItemId', 'Gallery item id'),
    run: async ({ params }) => {
      const [row] = await db.delete(galleryItems).where(eq(galleryItems.id, params.galleryItemId)).returning()
      if (!row) throw notFound('Gallery item')
      refreshSite()
      return { deleted: row.id }
    },
  }),

  // ---------- Services ----------
  op({
    id: 'list_services',
    method: 'GET',
    path: '/content/services',
    tag: 'Website content',
    scope: 'read',
    permission: 'content:manage',
    summary: 'List the services shown on the website.',
    run: async () => ({ services: await db.select().from(services).orderBy(asc(services.sort)) }),
  }),
  op({
    id: 'upsert_service',
    method: 'POST',
    path: '/content/services',
    tag: 'Website content',
    scope: 'content',
    permission: 'content:manage',
    summary: 'Add a service to the website, or update one by id.',
    body: z.object({
      serviceId: zId.optional().describe('Pass to update an existing service; omit to create'),
      name: zText(120).min(1),
      summary: zText(300).min(1).describe('One sentence shown on cards'),
      body: zText(5000).default('').describe('Longer description on the Services page'),
      icon: ICONS.default('hammer'),
      sort: z.number().int().default(0),
      published: z.boolean().default(true),
    }),
    run: async ({ body }) => {
      const { serviceId: id, ...values } = body
      const [row] = id
        ? await db.update(services).set(values).where(eq(services.id, id)).returning()
        : await db.insert(services).values({ ...values, slug: slugify(values.name) }).onConflictDoNothing().returning()
      if (!row) throw id ? notFound('Service') : badRequest('A service with that name already exists.')
      refreshSite()
      return { service: row }
    },
  }),

  // ---------- FAQ ----------
  op({
    id: 'list_faqs',
    method: 'GET',
    path: '/content/faqs',
    tag: 'Website content',
    scope: 'read',
    permission: 'content:manage',
    summary: 'List FAQ entries on the website.',
    run: async () => ({ faqs: await db.select().from(faqs).orderBy(asc(faqs.sort)) }),
  }),
  op({
    id: 'upsert_faq',
    method: 'POST',
    path: '/content/faqs',
    tag: 'Website content',
    scope: 'content',
    permission: 'content:manage',
    summary: 'Add an FAQ question & answer, or update one by id.',
    body: z.object({
      faqId: zId.optional().describe('Pass to update an existing FAQ; omit to create'),
      question: zText(300).min(1),
      answer: zText(3000).min(1),
      sort: z.number().int().default(0),
    }),
    run: async ({ body }) => {
      const { faqId: id, ...values } = body
      const [row] = id
        ? await db.update(faqs).set(values).where(eq(faqs.id, id)).returning()
        : await db.insert(faqs).values(values).returning()
      if (!row) throw notFound('FAQ')
      refreshSite()
      return { faq: row }
    },
  }),
  op({
    id: 'delete_faq',
    method: 'DELETE',
    path: '/content/faqs/{faqId}',
    tag: 'Website content',
    scope: 'content',
    permission: 'content:manage',
    summary: 'Remove an FAQ entry.',
    params: idParam('faqId', 'FAQ id'),
    run: async ({ params }) => {
      const [row] = await db.delete(faqs).where(eq(faqs.id, params.faqId)).returning()
      if (!row) throw notFound('FAQ')
      refreshSite()
      return { deleted: row.id }
    },
  }),

  // ---------- Service areas ----------
  op({
    id: 'list_service_areas',
    method: 'GET',
    path: '/content/areas',
    tag: 'Website content',
    scope: 'read',
    permission: 'content:manage',
    summary: 'List towns served (each has its own local-SEO page at /areas/<slug>).',
    run: async () => ({ areas: await db.select().from(serviceAreas).orderBy(asc(serviceAreas.city)) }),
  }),
  op({
    id: 'upsert_service_area',
    method: 'POST',
    path: '/content/areas',
    tag: 'Website content',
    scope: 'content',
    permission: 'content:manage',
    summary: 'Add a town Willy serves (creates a local SEO page), or update one by id. Set published=false to hide it.',
    body: z.object({
      areaId: zId.optional().describe('Pass to update an existing service area; omit to create'),
      city: zText(80).min(1),
      state: zText(20).min(2),
      blurb: zText(2000).optional().describe('Optional custom intro paragraph for that town’s page'),
      published: z.boolean().default(true),
    }),
    run: async ({ body }) => {
      const { areaId: id, ...values } = body
      const slug = slugify(`${values.city}-${values.state}`)
      const [row] = id
        ? await db.update(serviceAreas).set({ ...values, slug }).where(eq(serviceAreas.id, id)).returning()
        : await db.insert(serviceAreas).values({ ...values, slug }).onConflictDoNothing().returning()
      if (!row) throw id ? notFound('Service area') : badRequest('That town is already listed.')
      refreshSite()
      return { area: row }
    },
  }),

  // ---------- Settings ----------
  op({
    id: 'get_settings',
    method: 'GET',
    path: '/settings',
    tag: 'Settings',
    scope: 'read',
    permission: 'settings:manage',
    summary: 'Read business settings (name, contact info, hero text, tax rate, payment terms, scheduling, review automation).',
    run: async () => {
      const s = await getSettings()
      return { settings: { ...s, taxRatePercent: s.taxRateBps / 100 } }
    },
  }),
  op({
    id: 'update_settings',
    method: 'PATCH',
    path: '/settings',
    tag: 'Settings',
    scope: 'settings',
    permission: 'settings:manage',
    summary: 'Update business settings. Only the fields you send change. Confirm with Willy before changing anything customers see.',
    body: z.object({
      businessName: zText(120).min(1).optional(),
      tagline: zText(200).optional(),
      ownerName: zText(80).min(1).optional(),
      phone: zText(40).min(7).optional(),
      email: z.email().optional(),
      address: zText(200).optional(),
      city: zText(80).optional(),
      state: zText(20).optional(),
      licenseNumber: zText(60).optional(),
      insured: z.boolean().optional(),
      yearsInBusiness: z.number().int().min(0).max(100).optional(),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe('Hex color like #ea580c'),
      heroHeadline: zText(160).optional(),
      heroSubhead: zText(400).optional(),
      aboutText: zText(5000).optional(),
      taxRatePercent: z.number().min(0).max(50).optional(),
      paymentTermsDays: z.number().int().min(0).max(120).optional(),
      invoiceFooter: zText(300).optional(),
      googleReviewUrl: z.url().startsWith('https://').or(z.literal('')).optional(),
      facebookUrl: z.url().startsWith('https://').or(z.literal('')).optional(),
      instagramUrl: z.url().startsWith('https://').or(z.literal('')).optional(),
      notifyEmail: z.email().or(z.literal('')).optional().describe('Where new quote requests are emailed'),
      notifyPhone: zText(40).optional().describe('Where new quote requests are texted'),
      reviewRequestsEnabled: z.boolean().optional(),
      reviewDelayDays: z.number().int().min(0).max(30).optional(),
      overdueRemindersEnabled: z.boolean().optional(),
      dailyCapacity: z.number().int().min(1).max(50).optional().describe('How many jobs can run at the same time'),
      workDays: z.array(z.number().int().min(0).max(6)).optional().describe('0=Sunday … 6=Saturday'),
    }),
    run: async ({ body }) => {
      const { taxRatePercent, workDays, ...rest } = body
      if (!Object.keys(body).length) throw badRequest('Nothing to update.')
      await getSettings() // ensure the row exists
      await db
        .update(settings)
        .set({
          ...rest,
          ...(taxRatePercent !== undefined ? { taxRateBps: Math.round(taxRatePercent * 100) } : {}),
          ...(workDays ? { workDays: [...new Set(workDays)].sort().join(',') } : {}),
          updatedAt: new Date(),
        })
        .where(eq(settings.id, 1))
      refreshSite()
      const [s] = await db.select().from(settings).where(eq(settings.id, 1))
      return { settings: { ...s, taxRatePercent: s.taxRateBps / 100 } }
    },
  }),
]
