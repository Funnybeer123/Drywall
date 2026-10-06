import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink, Star } from 'lucide-react'
import { Stars, buttonClass } from '@/components/ui'
import { getSettings } from '@/lib/settings'
import { getRating, getTestimonials } from '../_lib/data'
import { GoogleIcon } from '../_components/icons'
import { CtaBand, PageHero, TestimonialCard } from '../_components/sections'

export async function generateMetadata(): Promise<Metadata> {
  const [s, rating] = await Promise.all([getSettings(), getRating()])
  const score = rating.count ? ` Rated ${rating.average.toFixed(1)}/5 from ${rating.count} reviews.` : ''
  return {
    title: `Customer Reviews — ${s.city}, ${s.state} Drywall Contractor`,
    description: `Read what homeowners and builders in ${s.city}, ${s.state} say about ${s.businessName}.${score}`,
    alternates: { canonical: '/reviews' },
  }
}

export default async function ReviewsPage() {
  const [s, testimonials, rating] = await Promise.all([getSettings(), getTestimonials(), getRating()])
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: testimonials.filter((t) => t.rating === n).length }))

  return (
    <>
      <PageHero
        eyebrow="Reviews"
        title="Don’t just take our word for it"
        description={`Honest feedback from customers around ${s.city}. We earn every one of these by showing up, doing it right, and cleaning up after ourselves.`}
      >
        {s.googleReviewUrl ? (
          <a href={s.googleReviewUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('dark', 'lg')}>
            <GoogleIcon className="size-4" /> Leave us a review <ExternalLink className="size-4 opacity-60" aria-hidden="true" />
          </a>
        ) : null}
      </PageHero>

      <section className="container-x py-16 sm:py-20">
        {testimonials.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-10 text-center ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">Reviews are coming soon.</p>
            <p className="mt-1 text-slate-600">
              Worked with us? We’d love to hear how it went.{' '}
              <Link href="/contact" className="font-semibold text-brand">
                Get in touch
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[300px_1fr] lg:gap-12">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">Average rating</p>
                <div className="mt-2 flex items-end gap-3">
                  <span className="text-5xl font-bold tracking-tight text-slate-900">{rating.average.toFixed(1)}</span>
                  <span className="pb-1.5 text-slate-500">/ 5</span>
                </div>
                <Stars rating={Math.round(rating.average)} className="mt-2 text-2xl" />
                <p className="mt-1 text-sm text-slate-500">
                  Based on {rating.count} review{rating.count === 1 ? '' : 's'}
                </p>
                <ul className="mt-6 space-y-2">
                  {dist.map(({ n, count }) => (
                    <li key={n} className="flex items-center gap-3 text-sm">
                      <span className="inline-flex w-8 items-center gap-1 text-slate-600">
                        {n} <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full bg-amber-400"
                          style={{ width: `${rating.count ? (count / rating.count) * 100 : 0}%` }}
                        />
                      </span>
                      <span className="w-6 text-right text-slate-500">{count}</span>
                    </li>
                  ))}
                </ul>
                {s.googleReviewUrl ? (
                  <a
                    href={s.googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass('secondary', 'md', 'mt-6 w-full')}
                  >
                    <GoogleIcon className="size-4" /> Leave us a review
                  </a>
                ) : null}
              </div>
            </aside>

            <div className="columns-1 gap-6 md:columns-2 [&>*]:mb-6 [&>*]:break-inside-avoid">
              {testimonials.map((t) => (
                <TestimonialCard key={t.id} t={t} />
              ))}
            </div>
          </div>
        )}
      </section>

      <CtaBand s={s} title="Join our list of happy customers" />
    </>
  )
}
