import type { Metadata } from 'next'
import Link from 'next/link'
import { inArray, like, or, sql } from 'drizzle-orm'
import { ArrowRight, CircleCheck, CircleX, HelpCircle, Image as ImageIcon, MapPin, Star, Wrench } from 'lucide-react'
import { db } from '@/db'
import { faqs, galleryItems, serviceAreas, services, testimonials } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { getSettings } from '@/lib/settings'
import { formatPhone } from '@/lib/utils'
import { Card, CardHeader, PageHeader } from '@/components/ui'
import { ContentTabs } from './tabs'
import { DEFAULT_EMAIL, DEFAULT_PHONE, SAMPLE_TESTIMONIAL_PREFIX, SEED_AREA_CITIES } from './constants'

export const metadata: Metadata = { title: 'Website content' }

const count = sql<number>`count(*)::int`

export default async function ContentIndexPage() {
  const user = await requireUser('content:manage')
  const isOwner = can(user, 'settings:manage')
  const s = await getSettings()

  const [[gallery], [reviews], [svc], [faq], [areas], [sampleReviews], [placeholderPhotos], seedAreas] = await Promise.all([
    db.select({ n: count }).from(galleryItems),
    db.select({ n: count }).from(testimonials),
    db.select({ n: count }).from(services),
    db.select({ n: count }).from(faqs),
    db.select({ n: count }).from(serviceAreas),
    db.select({ n: count }).from(testimonials).where(like(testimonials.customerName, `${SAMPLE_TESTIMONIAL_PREFIX}%`)),
    db
      .select({ n: count })
      .from(galleryItems)
      .where(or(like(galleryItems.imageUrl, '/placeholder/%'), like(galleryItems.beforeImageUrl, '/placeholder/%'))),
    db.select({ city: serviceAreas.city }).from(serviceAreas).where(inArray(serviceAreas.city, SEED_AREA_CITIES)),
  ])

  const sections = [
    { href: '/admin/content/gallery', label: 'Gallery', Icon: ImageIcon, n: gallery.n, desc: 'Before & after photos of your work' },
    { href: '/admin/content/testimonials', label: 'Reviews', Icon: Star, n: reviews.n, desc: 'What customers say about you' },
    { href: '/admin/content/services', label: 'Services', Icon: Wrench, n: svc.n, desc: 'What you offer, one page each' },
    { href: '/admin/content/faqs', label: 'FAQ', Icon: HelpCircle, n: faq.n, desc: 'Answers to common questions' },
    { href: '/admin/content/areas', label: 'Service areas', Icon: MapPin, n: areas.n, desc: 'Local pages for each town you serve' },
  ]

  const phoneDefault = formatPhone(s.phone) === DEFAULT_PHONE
  const emailDefault = s.email.trim().toLowerCase() === DEFAULT_EMAIL
  const checklist: { ok: boolean; label: string; detail: string; href: string | null; fix: string }[] = [
    {
      ok: sampleReviews.n === 0,
      label: 'Sample reviews removed',
      detail: sampleReviews.n ? `${sampleReviews.n} sample review(s) still on the site. Replace them with real ones.` : 'Only real reviews are listed.',
      href: '/admin/content/testimonials',
      fix: 'Manage reviews',
    },
    {
      ok: placeholderPhotos.n === 0,
      label: 'Real photos in the gallery',
      detail: placeholderPhotos.n
        ? `${placeholderPhotos.n} gallery item(s) still use placeholder pictures. Upload photos of your own jobs.`
        : 'All gallery photos are your own.',
      href: '/admin/content/gallery',
      fix: 'Manage gallery',
    },
    {
      ok: seedAreas.length === 0,
      label: 'Service areas updated',
      detail: seedAreas.length
        ? `Sample towns still listed: ${seedAreas.map((a) => a.city).join(', ')}. If you really serve them, add a local blurb and ignore this.`
        : 'Your own towns are listed.',
      href: '/admin/content/areas',
      fix: 'Manage areas',
    },
    {
      ok: !!s.googleReviewUrl,
      label: 'Google review link set',
      detail: s.googleReviewUrl ? 'Review requests send customers straight to your Google page.' : 'Needed so review requests send customers to Google.',
      href: isOwner ? '/admin/settings' : null,
      fix: 'Open settings',
    },
    {
      ok: !phoneDefault && !emailDefault,
      label: 'Real phone & email',
      detail:
        phoneDefault || emailDefault
          ? `Still using the demo ${[phoneDefault && `phone ${DEFAULT_PHONE}`, emailDefault && `email ${DEFAULT_EMAIL}`].filter(Boolean).join(' and ')}.`
          : `${formatPhone(s.phone)} · ${s.email}`,
      href: isOwner ? '/admin/settings' : null,
      fix: 'Open settings',
    },
  ]
  const done = checklist.filter((c) => c.ok).length

  return (
    <>
      <PageHeader title="Website content" description="Everything customers see on your website. Changes go live as soon as you save." />
      <ContentTabs active="/admin/content" />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:col-span-3">
          {sections.map(({ href, label, Icon, n, desc }) => (
            <Link key={href} href={href} className="group">
              <Card className="flex h-full items-start gap-3 p-4 transition group-hover:ring-brand">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-fg">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center justify-between gap-2 font-semibold text-slate-900">
                    {label}
                    <span className="text-sm font-normal text-slate-500 tabular-nums">{n}</span>
                  </p>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Launch checklist"
            description={done === checklist.length ? 'All set — your site is ready for customers.' : `${done} of ${checklist.length} done before you go live.`}
          />
          <ul className="divide-y divide-slate-100">
            {checklist.map((c) => (
              <li key={c.label} className="flex gap-3 px-5 py-3">
                {c.ok ? (
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-label="Done" />
                ) : (
                  <CircleX className="mt-0.5 size-5 shrink-0 text-amber-500" aria-label="To do" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{c.label}</p>
                  <p className="text-xs text-slate-500">{c.detail}</p>
                  {!c.ok ? (
                    c.href ? (
                      <Link href={c.href} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-fg hover:underline">
                        {c.fix} <ArrowRight className="size-3" />
                      </Link>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">Ask the owner to update this in Settings.</p>
                    )
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
