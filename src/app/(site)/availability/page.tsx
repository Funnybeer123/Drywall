import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarCheck, Info } from 'lucide-react'
import { buttonClass } from '@/components/ui'
import type { DayStatus } from '@/lib/availability'
import { addMonths, startOfMonth, todayISO } from '@/lib/dates'
import { getSettings } from '@/lib/settings'
import { getAvailability } from '../_lib/data'
import { longDate } from '../_lib/format'
import { AvailabilityLegend, MonthGrid, monthsFrom } from '../_components/availability-calendar'
import { CtaBand, PageHero } from '../_components/sections'

// Schedule changes constantly — never cache this page.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    title: `Schedule & Availability — ${s.city}, ${s.state}`,
    description: `See ${s.businessName}'s open dates for drywall work in ${s.city}, ${s.state} over the next three months, and request a quote to lock in your start date.`,
    alternates: { canonical: '/availability' },
  }
}

const MONTHS = 3

export default async function AvailabilityPage() {
  const s = await getSettings()
  const today = todayISO()
  const from = startOfMonth(today)
  const until = addMonths(today, MONTHS) // first day after the last shown month
  const totalDays = Math.round((Date.parse(until) - Date.parse(from)) / 86_400_000)
  const days = await getAvailability(from, totalDays)

  const statuses = new Map<string, DayStatus>(days.map((d) => [d.date, d.status]))
  const upcoming = days.filter((d) => d.date > today)
  const next = upcoming.find((d) => d.status === 'open' || d.status === 'limited')?.date ?? null
  const openCount = upcoming.filter((d) => d.status === 'open').length

  return (
    <>
      <PageHero
        eyebrow="Availability"
        title="When can you start?"
        description="Our live schedule for the next three months. Book early — good drywall crews fill up fast."
      />

      <section className="container-x py-12 sm:py-16">
        <div className="mb-10 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-4 rounded-2xl bg-slate-900 p-6 text-white sm:items-center sm:p-7">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand text-white">
              <CalendarCheck className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-400">Next available start date</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
                {next ? longDate(next) : 'Call for the next opening'}
              </p>
              {next ? (
                <p className="mt-1 text-sm text-slate-400">
                  {openCount} fully open work day{openCount === 1 ? '' : 's'} in the next {MONTHS} months
                </p>
              ) : null}
            </div>
          </div>
          <Link href="/quote" className={buttonClass('primary', 'lg', 'w-full lg:w-auto')}>
            Request a quote <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <AvailabilityLegend className="mb-6" />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {monthsFrom(today, MONTHS).map((m) => (
            <MonthGrid key={m} month={m} statuses={statuses} today={today} />
          ))}
        </div>

        <p className="mt-8 flex items-start gap-2 text-sm text-slate-500">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Availability is updated automatically as jobs are booked. Small repairs can often be squeezed in sooner — call or
          text to ask. Start dates are confirmed once your estimate is accepted.
        </p>
      </section>

      <CtaBand
        s={s}
        title="Grab an open date before it’s gone"
        description="Request a free quote today and we’ll pencil you in for the earliest opening that fits your project."
      />
    </>
  )
}
