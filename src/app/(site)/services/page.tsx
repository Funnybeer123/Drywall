import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { buttonClass } from '@/components/ui'
import { getSettings } from '@/lib/settings'
import { getServices } from '../_lib/data'
import { paragraphs } from '../_lib/format'
import { ServiceIcon } from '../_components/icons'
import { CtaBand, PageHero } from '../_components/sections'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    title: `Drywall Services in ${s.city}, ${s.state}`,
    description: `Drywall hanging & finishing, repair, texture, popcorn ceiling removal, water damage and commercial drywall in ${s.city}, ${s.state}. Free quotes from ${s.businessName}.`,
    alternates: { canonical: '/services' },
  }
}

export default async function ServicesPage() {
  const [s, services] = await Promise.all([getSettings(), getServices()])

  return (
    <>
      <PageHero
        eyebrow="Services"
        title={`Drywall services for ${s.city} homes & businesses`}
        description="Whether it’s a doorknob hole or a whole new house, you get the same careful prep, clean job site and flawless finish."
      >
        {services.length > 1 ? (
          <nav aria-label="Jump to a service" className="flex flex-wrap gap-2">
            {services.map((sv) => (
              <a
                key={sv.id}
                href={`#${sv.slug}`}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 ring-inset hover:text-slate-900 hover:ring-slate-400"
              >
                {sv.name}
              </a>
            ))}
          </nav>
        ) : null}
      </PageHero>

      <section className="container-x py-16 sm:py-20">
        {services.length === 0 ? (
          <p className="text-slate-600">
            Service details are coming soon. In the meantime, <Link href="/quote" className="font-semibold text-brand">request a free quote</Link>.
          </p>
        ) : (
          <div className="divide-y divide-slate-200">
            {services.map((sv, i) => (
              <article
                key={sv.id}
                id={sv.slug}
                className="grid scroll-mt-24 gap-6 py-12 first:pt-0 last:pb-0 md:grid-cols-[auto_1fr_auto] md:gap-10"
              >
                <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <ServiceIcon name={sv.icon} className="size-7" />
                </span>
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold text-slate-400">{String(i + 1).padStart(2, '0')}</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{sv.name}</h2>
                  <p className="mt-3 text-lg leading-relaxed text-slate-700">{sv.summary}</p>
                  {paragraphs(sv.body).map((p, j) => (
                    <p key={j} className="mt-4 leading-relaxed text-slate-600">
                      {p}
                    </p>
                  ))}
                  <ul className="mt-6 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    {['Free, itemized estimate', 'Floors & furniture protected', 'Dust-control sanding', 'Clean, paint-ready finish'].map(
                      (x) => (
                        <li key={x} className="flex items-center gap-2">
                          <Check className="size-4 shrink-0 text-emerald-600" aria-hidden="true" /> {x}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
                <div className="md:pt-7">
                  <Link href={`/quote?type=${encodeURIComponent(sv.slug)}`} className={buttonClass('secondary', 'md')}>
                    Get a quote <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <CtaBand s={s} title="Not sure what you need?" description="Send a few photos and a quick description. We’ll tell you exactly what it takes to fix it — free." />
    </>
  )
}
