import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays, Mail, MapPin, MessageSquare, Phone } from 'lucide-react'
import { buttonClass } from '@/components/ui'
import { getSettings } from '@/lib/settings'
import { formatPhone, smsHref, telHref } from '@/lib/utils'
import { getNextAvailable, getServiceAreas } from '../_lib/data'
import { friendlyDate } from '../_lib/format'
import { workDaysLabel } from '../_components/chrome'
import { AreaChips, PageHero } from '../_components/sections'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    title: `Contact Us — Drywall Contractor in ${s.city}, ${s.state}`,
    description: `Call, text or email ${s.businessName} for drywall work in ${s.city}, ${s.state}. ${formatPhone(s.phone)}. Free quotes.`,
    alternates: { canonical: '/contact' },
  }
}

export default async function ContactPage() {
  const [s, areas, next] = await Promise.all([getSettings(), getServiceAreas(), getNextAvailable()])
  const phone = formatPhone(s.phone)

  const methods = [
    { Icon: Phone, label: 'Call', value: phone, href: telHref(s.phone), note: 'Fastest way to reach us' },
    { Icon: MessageSquare, label: 'Text', value: phone, href: smsHref(s.phone), note: 'Send photos right from your phone' },
    { Icon: Mail, label: 'Email', value: s.email, href: `mailto:${s.email}`, note: 'We reply within one business day' },
  ]

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let’s talk drywall"
        description={`Questions, scheduling, or a quick price check — reach ${s.ownerName} directly. For a detailed estimate, the quote form is the fastest route.`}
      >
        <Link href="/quote" className={buttonClass('primary', 'lg')}>
          Request a free quote <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </PageHero>

      <section className="container-x py-16 sm:py-20">
        <ul className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          {methods.map(({ Icon, label, value, href, note }) => (
            <li key={label}>
              <a
                href={href}
                className="group flex h-full flex-col rounded-2xl bg-surface p-6 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-slate-300"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-fg transition-colors group-hover:bg-brand group-hover:text-white">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="mt-4 text-sm font-medium text-slate-500">{label}</span>
                <span className="mt-0.5 text-lg font-semibold break-all text-slate-900">{value}</span>
                <span className="mt-2 text-sm text-slate-500">{note}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200 sm:p-8">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <CalendarDays className="size-5 text-brand-fg" aria-hidden="true" /> Hours & scheduling
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
                <dt className="text-slate-500">Crew work days</dt>
                <dd className="font-medium text-slate-900">{workDaysLabel(s.workDays)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
                <dt className="text-slate-500">Next available start</dt>
                <dd className="font-medium text-slate-900">{next ? friendlyDate(next) : 'Call to ask'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Quote response</dt>
                <dd className="font-medium text-slate-900">Within 1 business day</dd>
              </div>
            </dl>
            <Link href="/availability" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-fg">
              See the availability calendar <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200 sm:p-8">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <MapPin className="size-5 text-brand-fg" aria-hidden="true" /> Where we work
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Based in {s.address ? `${s.address}, ` : ''}
              {s.city}, {s.state}.{areas.length ? ' We regularly serve:' : ' We serve the surrounding area too.'}
            </p>
            {areas.length > 0 ? (
              <div className="mt-4">
                <AreaChips areas={areas} />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  )
}
