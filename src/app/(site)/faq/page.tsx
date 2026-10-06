import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { getSettings } from '@/lib/settings'
import { formatPhone, telHref } from '@/lib/utils'
import { getFaqs } from '../_lib/data'
import { paragraphs } from '../_lib/format'
import { JsonLd } from '../_components/json-ld'
import { CtaBand, PageHero } from '../_components/sections'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    title: `Drywall FAQ — ${s.city}, ${s.state}`,
    description: `Answers to common questions about drywall repair, installation, texture, timelines and pricing from ${s.businessName} in ${s.city}, ${s.state}.`,
    alternates: { canonical: '/faq' },
  }
}

export default async function FaqPage() {
  const [s, faqs] = await Promise.all([getSettings(), getFaqs()])

  return (
    <>
      {faqs.length > 0 ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          }}
        />
      ) : null}

      <PageHero
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Straight answers about how we work, what it costs, and what to expect."
      />

      <section className="container-x py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {faqs.length === 0 ? (
              <p className="py-6 text-slate-600">Questions and answers are coming soon.</p>
            ) : (
              faqs.map((f, i) => (
                <details key={f.id} className="group" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-lg font-semibold text-slate-900 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <ChevronDown
                      className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="space-y-3 pr-8 pb-6 leading-relaxed text-slate-600">
                    {paragraphs(f.answer).map((p, j) => (
                      <p key={j}>{p}</p>
                    ))}
                  </div>
                </details>
              ))
            )}
          </div>

          <aside className="h-fit rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200 lg:sticky lg:top-24">
            <p className="font-semibold text-slate-900">Still have a question?</p>
            <p className="mt-2 text-sm text-slate-600">
              Call or text{' '}
              <a href={telHref(s.phone)} className="font-semibold text-slate-900 hover:text-brand">
                {formatPhone(s.phone)}
              </a>{' '}
              or{' '}
              <Link href="/contact" className="font-semibold text-slate-900 hover:text-brand">
                send us a message
              </Link>
              . We’re happy to help, even if it’s just advice.
            </p>
            <Link
              href="/quote"
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Request a free quote
            </Link>
          </aside>
        </div>
      </section>

      <CtaBand s={s} />
    </>
  )
}
