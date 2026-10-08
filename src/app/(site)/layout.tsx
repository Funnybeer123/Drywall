import type { ReactNode } from 'react'
import { getSettings, appUrl } from '@/lib/settings'
import { toE164 } from '@/lib/utils'
import { getRating, getServiceAreas, getServices } from './_lib/data'
import { MobileCtaBar, SiteFooter, SiteHeader } from './_components/chrome'
import { JsonLd } from './_components/json-ld'

// Content is edited from the admin dashboard, so always render fresh.
export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [s, areas, rating, services] = await Promise.all([getSettings(), getServiceAreas(), getRating(), getServices()])

  const sameAs = [s.facebookUrl, s.instagramUrl, s.googleReviewUrl].filter(Boolean)
  const business: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': appUrl('/#business'),
    name: s.businessName,
    slogan: s.tagline,
    description: s.heroSubhead,
    url: appUrl('/'),
    telephone: toE164(s.phone) ?? s.phone,
    email: s.email,
    address: {
      '@type': 'PostalAddress',
      ...(s.address ? { streetAddress: s.address } : {}),
      addressLocality: s.city,
      addressRegion: s.state,
      addressCountry: 'US',
    },
    areaServed: (areas.length ? areas : [{ city: s.city, state: s.state }]).map((a) => ({
      '@type': 'City',
      name: `${a.city}, ${a.state}`,
    })),
    knowsAbout: services.map((sv) => sv.name),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Drywall services',
      itemListElement: services.map((sv) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: sv.name, description: sv.summary, url: appUrl(`/services#${sv.slug}`) },
      })),
    },
  }
  if (s.logoUrl) business.logo = s.logoUrl.startsWith('http') ? s.logoUrl : appUrl(s.logoUrl)
  if (s.logoUrl) business.image = business.logo
  if (sameAs.length) business.sameAs = sameAs
  if (s.ownerName) business.founder = { '@type': 'Person', name: s.ownerName }
  if (rating.count > 0) {
    business.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.average,
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <JsonLd data={business} />
      <a
        href="#main"
        className="sr-only z-[70] rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader s={s} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter s={s} areas={areas} />
      <MobileCtaBar s={s} />
    </div>
  )
}
