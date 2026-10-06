import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { and, eq } from 'drizzle-orm'
import { ArrowRight, Award, CalendarCheck, Check, MapPin, ShieldCheck } from 'lucide-react'
import { db } from '@/db'
import { serviceAreas } from '@/db/schema'
import { getSettings, appUrl } from '@/lib/settings'
import { getGallery, getNextAvailable, getServiceAreas, getServices, getTestimonials } from '../../_lib/data'
import { friendlyDate, paragraphs } from '../../_lib/format'
import { ServiceIcon } from '../../_components/icons'
import { JsonLd } from '../../_components/json-ld'
import { AreaChips, ContactButtons, CtaBand, SectionHeading, TestimonialCard } from '../../_components/sections'

type Props = { params: Promise<{ slug: string }> }

const getArea = cache(async (slug: string) => {
  const [area] = await db
    .select()
    .from(serviceAreas)
    .where(and(eq(serviceAreas.slug, slug), eq(serviceAreas.published, true)))
  return area ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [area, s] = await Promise.all([getArea(slug), getSettings()])
  if (!area) return { title: 'Service area not found', robots: { index: false } }
  const place = `${area.city}, ${area.state}`
  return {
    title: `Drywall Installation & Repair in ${place}`,
    description: `Need drywall work in ${place}? ${s.businessName} hangs, finishes, textures and repairs drywall for ${area.city} homeowners and builders. Licensed & insured — free quotes.`,
    alternates: { canonical: `/areas/${area.slug}` },
    openGraph: { title: `Drywall Installation & Repair in ${place} | ${s.businessName}` },
  }
}

/** Small stable hash so each city gets consistent (but different) intro wording. */
function pick<T>(slug: string, options: T[]): T {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return options[h % options.length]
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params
  const area = await getArea(slug)
  if (!area) notFound()

  const [s, services, testimonials, areas, gallery, next] = await Promise.all([
    getSettings(),
    getServices(),
    getTestimonials(),
    getServiceAreas(),
    getGallery(),
    getNextAvailable(),
  ])

  const city = area.city
  const place = `${area.city}, ${area.state}`
  const isHome = city.toLowerCase() === s.city.toLowerCase()
  const local = testimonials.filter((t) => t.location?.toLowerCase().includes(city.toLowerCase()))
  const reviews = [...local, ...testimonials.filter((t) => !local.includes(t) && t.featured)].slice(0, 3)
  const otherAreas = areas.filter((a) => a.slug !== area.slug)
  const photo = gallery.find((g) => g.featured && !g.beforeImageUrl) ?? gallery[0]
  const serviceNames = services.map((sv) => sv.name.toLowerCase())
  const serviceList =
    serviceNames.length > 2
      ? `${serviceNames.slice(0, -1).join(', ')} and ${serviceNames[serviceNames.length - 1]}`
      : serviceNames.join(' and ') || 'drywall installation and repair'

  const intro = area.blurb
    ? paragraphs(area.blurb)
    : [
        pick(area.slug, [
          `${s.businessName} is ${isHome ? 'based right here in' : 'proud to serve'} ${place}, bringing ${s.yearsInBusiness}+ years of drywall experience to homes and businesses across ${city}.`,
          `Looking for a drywall contractor in ${place}? ${s.businessName} has spent ${s.yearsInBusiness}+ years helping ${city} homeowners, builders and property managers get walls and ceilings done right the first time.`,
          `From a single patch to a full basement, ${city} homeowners trust ${s.businessName} for clean, careful drywall work — backed by ${s.yearsInBusiness}+ years in the trade.`,
        ]),
        `We handle ${serviceList} throughout ${city}${isHome ? '' : ` and the surrounding ${s.city} area`}. Every job gets the same treatment: floors and furniture protected, tight seams, consistent texture, and a clean, paint-ready finish.`,
      ]

  const faqs = [
    {
      q: `Do you offer free drywall estimates in ${city}?`,
      a: `Yes. Send a few photos through our quote form for a fast ballpark, or we can come out to your ${city} home to measure for an exact price.`,
    },
    {
      q: `How soon can you start a job in ${city}?`,
      a: next
        ? `Our next opening is ${friendlyDate(next)}. Small repairs can often be fit in sooner — check our live availability calendar or give us a call.`
        : 'Call or text us and we’ll find the earliest date that works — small repairs can often be fit in quickly.',
    },
    {
      q: `Can you match the existing texture in my ${city} home?`,
      a: 'Yes — knockdown, orange peel, skip trowel, smooth and hand textures. Repairs blend in so you can’t tell where the patch is.',
    },
  ]

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          serviceType: 'Drywall installation and repair',
          name: `Drywall Installation & Repair in ${place}`,
          url: appUrl(`/areas/${area.slug}`),
          provider: { '@id': appUrl('/#business') },
          areaServed: { '@type': 'City', name: place },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: appUrl('/') },
            { '@type': 'ListItem', position: 2, name: `Drywall in ${place}`, item: appUrl(`/areas/${area.slug}`) },
          ],
        }}
      />

      <section className="bg-drywall hero-has-media border-b border-slate-200">
        <div className="container-x grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" /> Serving {place}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl">
              Drywall Installation &amp; Repair in {place}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">{intro[0]}</p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-700">
              <li className="inline-flex items-center gap-2">
                <Award className="size-4 text-brand" aria-hidden="true" /> {s.yearsInBusiness}+ years experience
              </li>
              {s.insured ? (
                <li className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-4 text-brand" aria-hidden="true" /> Licensed & insured
                </li>
              ) : null}
              <li className="inline-flex items-center gap-2">
                <CalendarCheck className="size-4 text-brand" aria-hidden="true" /> {next ? `Next opening ${friendlyDate(next)}` : 'Free estimates'}
              </li>
            </ul>
            <ContactButtons s={s} className="mt-8" />
          </div>
          {photo ? (
            <div className="overflow-hidden rounded-3xl bg-slate-200 shadow-xl ring-1 ring-slate-900/5">
              <img src={photo.imageUrl} alt={`${photo.title} — drywall work near ${city}`} className="aspect-[4/3] w-full object-cover" />
            </div>
          ) : null}
        </div>
      </section>

      <section className="container-x py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Your local {city} drywall pros</h2>
            {intro.slice(1).map((p, i) => (
              <p key={i} className="mt-4 leading-relaxed text-slate-600">
                {p}
              </p>
            ))}
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                `Free, itemized estimates for ${city} homes`,
                'Clear communication from estimate to final walkthrough',
                'Clean job site, every day',
                'Texture matching that disappears',
              ].map((x) => (
                <li key={x} className="flex items-start gap-2 text-slate-700">
                  <Check className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" /> {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900">Common questions in {city}</h2>
            <dl className="mt-4 divide-y divide-slate-200">
              {faqs.map((f) => (
                <div key={f.q} className="py-4 first:pt-0 last:pb-0">
                  <dt className="font-medium text-slate-900">{f.q}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-600">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {services.length > 0 ? (
        <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-20">
          <div className="container-x">
            <SectionHeading eyebrow="Services" title={`Drywall services in ${city}`} />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((sv) => (
                <li key={sv.id} className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                    <ServiceIcon name={sv.icon} className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">
                    {sv.name} in {city}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{sv.summary}</p>
                  <Link
                    href={`/quote?type=${encodeURIComponent(sv.slug)}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"
                  >
                    Get a quote <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {reviews.length > 0 ? (
        <section className="container-x py-16 sm:py-20">
          <SectionHeading
            eyebrow="Reviews"
            title={local.length ? `What ${city} customers say` : 'What our customers say'}
            action={
              <Link href="/reviews" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-brand">
                All reviews <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          />
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {reviews.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      {otherAreas.length > 0 ? (
        <section className="container-x pb-4">
          <h2 className="text-lg font-semibold text-slate-900">Also serving nearby</h2>
          <div className="mt-4">
            <AreaChips areas={otherAreas} />
          </div>
        </section>
      ) : null}

      <CtaBand
        s={s}
        title={`Get a free drywall quote in ${city}`}
        description={`Tell us about your project and ${s.ownerName} will get back to you within one business day.`}
      />
    </>
  )
}
