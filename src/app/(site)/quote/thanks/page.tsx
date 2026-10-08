import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CircleCheck, Phone } from 'lucide-react'
import { buttonClass } from '@/components/ui'
import { getSettings } from '@/lib/settings'
import { formatPhone, telHref } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Thanks — we got your request',
  robots: { index: false, follow: true },
}

export default async function QuoteThanksPage() {
  const s = await getSettings()
  return (
    <section className="bg-drywall">
      <div className="container-x flex flex-col items-center py-20 text-center sm:py-28">
        <span className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CircleCheck className="size-8" aria-hidden="true" />
        </span>
        <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl">
          Thanks! Your quote request is in.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-slate-600">
          {s.ownerName} will review the details and get back to you within one business day, usually sooner. If you left an
          email, a confirmation is on its way.
        </p>
        <div className="mt-8 rounded-2xl bg-surface px-6 py-5 text-left shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Need us sooner, or forgot something?</p>
          <a href={telHref(s.phone)} className="mt-1 inline-flex items-center gap-2 text-lg font-bold text-slate-900 hover:text-brand-fg">
            <Phone className="size-5 text-brand-fg" aria-hidden="true" /> Call or text {formatPhone(s.phone)}
          </a>
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/work" className={buttonClass('dark', 'lg')}>
            Browse our work <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/reviews" className={buttonClass('secondary', 'lg')}>
            Read reviews
          </Link>
        </div>
      </div>
    </section>
  )
}
