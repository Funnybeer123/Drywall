import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, Award, CalendarCheck, Phone, ShieldCheck, Star } from 'lucide-react'
import { buttonClass } from '@/components/ui'
import { getSettings } from '@/lib/settings'
import { formatPhone, telHref } from '@/lib/utils'
import { getGallery, getNextAvailable, getRating, getServiceAreas, getServices, getTestimonials } from './_lib/data'
import { friendlyDate } from './_lib/format'
import { ServiceIcon } from './_components/icons'
import { BeforeAfter } from './_components/before-after'
import { HeroVideo } from './_components/hero-video'
import { AreaChips, CtaBand, ProcessSteps, SectionHeading, TestimonialCard } from './_components/sections'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    // Root layout's default title already targets "{business} | Drywall … in {city}, {state}".
    description: `${s.businessName} provides drywall hanging, taping, finishing, texture and repair in ${s.city}, ${s.state}. ${s.yearsInBusiness}+ years experience, licensed & insured. Get a free quote today.`,
    alternates: { canonical: '/' },
  }
}

export default async function HomePage() {
  const [s, services, gallery, testimonials, rating, areas, next] = await Promise.all([
    getSettings(),
    getServices(),
    getGallery(),
    getTestimonials(),
    getRating(),
    getServiceAreas(),
    getNextAvailable(),
  ])

  const featured = gallery.filter((g) => g.featured).slice(0, 6)
  const work = featured.length ? featured : gallery.slice(0, 6)
  const featuredReviews = testimonials.filter((t) => t.featured)
  const reviews = (featuredReviews.length ? featuredReviews : testimonials).slice(0, 3)

  return (
    <>
      {/* ---------- Hero: rotating slow-motion close-ups ---------- */}
      <section className="theme-static relative isolate overflow-hidden border-b border-slate-900 bg-slate-950 text-white">
        <HeroVideo />
        <div className="container-x relative flex min-h-[640px] flex-col justify-center py-20 sm:min-h-[680px] sm:py-24 lg:min-h-[760px] lg:py-28">
          <div className="max-w-2xl">
            {rating.count > 0 ? (
              <Link
                href="/reviews"
                className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                {rating.average.toFixed(1)} from {rating.count} review{rating.count === 1 ? '' : 's'}
              </Link>
            ) : null}
            <p className="eyebrow">
              Drywall contractor · {s.city}, {s.state}
            </p>
            <h1 className="mt-4 text-[2.5rem] leading-[1.05] font-bold tracking-tight text-balance text-white sm:text-5xl lg:text-6xl">
              {s.heroHeadline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-slate-200">{s.heroSubhead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/quote" className={buttonClass('primary', 'lg')}>
                Get a free quote <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a
                href={telHref(s.phone)}
                className={buttonClass('secondary', 'lg', 'bg-white/10 text-white ring-white/30 backdrop-blur-sm hover:bg-white/20')}
              >
                <Phone className="size-4" aria-hidden="true" /> {formatPhone(s.phone)}
              </a>
            </div>

            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/15 pt-8 sm:grid-cols-4">
              <TrustItem icon={<Award className="size-5" />} value={`${s.yearsInBusiness}+ yrs`} label="In business" />
              {s.insured ? (
                <TrustItem icon={<ShieldCheck className="size-5" />} value="Licensed" label="& fully insured" />
              ) : null}
              {rating.count > 0 ? (
                <TrustItem
                  icon={<Star className="size-5 fill-current" />}
                  value={`${rating.average.toFixed(1)} / 5`}
                  label={`${rating.count} review${rating.count === 1 ? '' : 's'}`}
                />
              ) : null}
              <TrustItem
                icon={<CalendarCheck className="size-5" />}
                value={next ? friendlyDate(next) : 'Call us'}
                label="Next available"
                href="/availability"
              />
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Services ---------- */}
      {services.length > 0 ? (
        <section className="container-x py-20 sm:py-24">
          <SectionHeading
            eyebrow="What we do"
            title={`Drywall services in ${s.city} and beyond`}
            description="One crew for the whole job — from the first sheet to a paint-ready finish. No subcontracting surprises."
            action={
              <Link href="/services" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-brand-fg">
                All services <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {services.map((sv) => (
              <li key={sv.id}>
                <Link
                  href={`/services#${sv.slug}`}
                  className="group flex h-full flex-col rounded-2xl bg-surface p-6 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-slate-300 sm:p-7"
                >
                  <span className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand-fg transition-colors group-hover:bg-brand group-hover:text-white">
                    <ServiceIcon name={sv.icon} className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">{sv.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{sv.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-fg">
                    Learn more <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------- Featured work ---------- */}
      {work.length > 0 ? (
        <section className="border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
          <div className="container-x">
            <SectionHeading
              eyebrow="Recent work"
              title="See the difference a pro finish makes"
              description="Drag the slider on before & after photos to compare."
              action={
                <Link href="/work" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-brand-fg">
                  View the full portfolio <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              }
            />
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {work.map((item) => (
                <li key={item.id} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-slate-200">
                  {item.beforeImageUrl ? (
                    <BeforeAfter before={item.beforeImageUrl} after={item.imageUrl} alt={item.title} />
                  ) : (
                    <Link href="/work" className="block aspect-[4/3] overflow-hidden bg-slate-100">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                      />
                    </Link>
                  )}
                  <div className="p-4">
                    <p className="text-xs font-semibold tracking-wide text-brand-fg uppercase">{item.category}</p>
                    <p className="mt-1 font-semibold text-slate-900">{item.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------- Process ---------- */}
      <section className="container-x py-20 sm:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="Simple from first call to final coat"
          description="Clear pricing, a real start date, and a crew that shows up when we say we will."
          align="center"
        />
        <ProcessSteps />
        <div className="mt-10 flex justify-center">
          <Link href="/quote" className={buttonClass('dark', 'lg')}>
            Start with a free quote <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      {reviews.length > 0 ? (
        <section className="bg-slate-50 py-20 sm:py-24">
          <div className="container-x">
            <SectionHeading
              eyebrow="Reviews"
              title={
                rating.count > 0
                  ? `Rated ${rating.average.toFixed(1)} out of 5 by our customers`
                  : 'What our customers say'
              }
              action={
                <Link href="/reviews" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-brand-fg">
                  Read all reviews <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              }
            />
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
              {reviews.map((t) => (
                <TestimonialCard key={t.id} t={t} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------- Service areas ---------- */}
      {areas.length > 0 ? (
        <section className="container-x py-16 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <p className="eyebrow">Service area</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Proudly serving {s.city} and nearby communities
              </h2>
              <p className="mt-3 text-slate-600">
                Don’t see your town? Ask anyway — we travel for the right project.
              </p>
            </div>
            <AreaChips areas={areas} />
          </div>
        </section>
      ) : null}

      <CtaBand s={s} />
    </>
  )
}

function TrustItem({
  icon,
  value,
  label,
  href,
}: {
  icon: ReactNode
  value: string
  label: string
  href?: string
}) {
  const body = (
    <span className="flex items-start gap-3">
      <span className="mt-0.5 text-brand-fg" aria-hidden="true">
        {icon}
      </span>
      <span>
        <span className="block text-base font-bold text-white">{value}</span>
        <span className="block text-sm text-slate-300">{label}</span>
      </span>
    </span>
  )
  return (
    <li>
      {href ? (
        <Link href={href} className="block rounded-lg hover:opacity-80">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  )
}
