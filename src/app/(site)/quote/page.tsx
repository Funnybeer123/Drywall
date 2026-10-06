import type { Metadata } from 'next'
import { CalendarCheck, Clock, MessageSquare, Phone, ShieldCheck } from 'lucide-react'
import { getSettings } from '@/lib/settings'
import { formatPhone, smsHref, telHref } from '@/lib/utils'
import { getNextAvailable } from '../_lib/data'
import { friendlyDate } from '../_lib/format'
import { QuoteForm } from './quote-form'
import { matchJobType } from './options'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    title: `Free Drywall Quote — ${s.city}, ${s.state}`,
    description: `Request a free drywall estimate from ${s.businessName} in ${s.city}, ${s.state}. Send photos for a fast ballpark price — we reply within one business day.`,
    alternates: { canonical: '/quote' },
  }
}

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ type?: string | string[] }> }) {
  const [{ type }, s, next] = await Promise.all([searchParams, getSettings(), getNextAvailable()])
  const defaultJobType = matchJobType(Array.isArray(type) ? type[0] : type)
  const phone = formatPhone(s.phone)

  return (
    <section className="bg-drywall">
      <div className="container-x grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_360px] lg:gap-12 lg:py-20">
        <div>
          <p className="eyebrow">Free quote</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl">Tell us about your project</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Two minutes is all it takes. {s.ownerName} personally reviews every request and gets back to you within one
            business day — usually sooner.
          </p>

          <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <QuoteForm defaultJobType={defaultJobType} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined} />
          </div>
        </div>

        <aside className="space-y-6 lg:pt-28">
          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <p className="font-semibold">Prefer to talk?</p>
            <p className="mt-1 text-sm text-slate-400">Call or text — we answer during the work day and return messages fast.</p>
            <div className="mt-5 grid gap-2">
              <a href={telHref(s.phone)} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-brand font-semibold text-white hover:bg-brand-dark">
                <Phone className="size-4" aria-hidden="true" /> {phone}
              </a>
              <a href={smsHref(s.phone)} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-white/10 font-semibold text-white hover:bg-white/20">
                <MessageSquare className="size-4" aria-hidden="true" /> Text us
              </a>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">What happens next</p>
            <ol className="mt-4 space-y-4 text-sm text-slate-600">
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  <span className="font-medium text-slate-900">We review your request</span> and reach out within one business day.
                </span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  <span className="font-medium text-slate-900">You get a clear, itemized estimate</span> you can accept online.
                </span>
              </li>
              <li className="flex gap-3">
                <CalendarCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  <span className="font-medium text-slate-900">We lock in your start date.</span>{' '}
                  {next ? <>Next opening: {friendlyDate(next)}.</> : null}
                </span>
              </li>
            </ol>
          </div>

          {s.insured || s.licenseNumber ? (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="size-4 text-emerald-600" aria-hidden="true" />
              {s.insured ? 'Licensed & insured' : 'Licensed'}
              {s.licenseNumber ? ` · Lic. #${s.licenseNumber}` : ''}
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  )
}
