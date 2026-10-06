import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, ClipboardList, MapPin, MessageSquare, Phone, Ruler, CalendarCheck, Sparkles, Quote } from 'lucide-react'
import type { Settings } from '@/db/schema'
import { Stars, buttonClass } from '@/components/ui'
import { cn, formatPhone, smsHref, telHref } from '@/lib/utils'

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        'mb-10 flex flex-col gap-4 sm:mb-12',
        align === 'center' ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between',
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance text-slate-900 sm:text-4xl">{title}</h2>
        {description ? <p className="mt-4 text-base leading-relaxed text-pretty text-slate-600 sm:text-lg">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/** Header band for inner pages. */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="bg-drywall border-b border-slate-200">
      <div className="container-x py-14 sm:py-20">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl">{title}</h1>
        {description ? (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-slate-600">{description}</p>
        ) : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  )
}

export type TestimonialLike = {
  id: number
  customerName: string
  location: string | null
  rating: number
  quote: string
  projectType: string | null
}

export function TestimonialCard({ t, className }: { t: TestimonialLike; className?: string }) {
  return (
    <figure className={cn('flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-7', className)}>
      <div className="flex items-center justify-between">
        <Stars rating={Math.min(5, Math.max(1, t.rating))} className="text-lg" />
        <Quote className="size-6 text-slate-200" aria-hidden="true" />
      </div>
      <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-700">“{t.quote}”</blockquote>
      <figcaption className="mt-6 border-t border-slate-100 pt-4">
        <p className="font-semibold text-slate-900">{t.customerName}</p>
        <p className="text-sm text-slate-500">{[t.projectType, t.location].filter(Boolean).join(' · ')}</p>
      </figcaption>
    </figure>
  )
}

const STEPS = [
  { Icon: ClipboardList, title: 'Request a quote', body: 'Tell us about the job and send a few photos. It takes about two minutes.' },
  { Icon: Ruler, title: 'Get your estimate', body: 'We review the details, measure if needed, and send a clear, itemized price.' },
  { Icon: CalendarCheck, title: 'Pick your dates', body: 'Accept online and lock in a start date that works for you.' },
  { Icon: Sparkles, title: 'Flawless finish', body: 'We protect your space, do it right, and leave it clean and paint-ready.' },
]

export function ProcessSteps() {
  return (
    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map(({ Icon, title, body }, i) => (
        <li key={title} className="relative rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">{i + 1}</span>
            <Icon className="size-5 text-brand" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
        </li>
      ))}
    </ol>
  )
}

export function AreaChips({ areas, current }: { areas: { slug: string; city: string; state: string }[]; current?: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {areas.map((a) => (
        <li key={a.slug}>
          <Link
            href={`/areas/${a.slug}`}
            aria-current={current === a.slug ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors ring-inset',
              current === a.slug
                ? 'bg-slate-900 text-white ring-slate-900'
                : 'bg-white text-slate-700 ring-slate-200 hover:text-slate-900 hover:ring-slate-400',
            )}
          >
            <MapPin className="size-3.5 text-brand" aria-hidden="true" />
            {a.city}, {a.state}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Dark closing call-to-action band used at the bottom of most pages. */
export function CtaBand({
  s,
  title = 'Ready for walls you’ll be proud of?',
  description,
}: {
  s: Settings
  title?: string
  description?: string
}) {
  return (
    <section className="container-x py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-12 sm:px-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '96px 192px',
          }}
        />
        <div aria-hidden="true" className="absolute -top-24 -right-24 size-72 rounded-full bg-brand opacity-30 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl">{title}</h2>
            <p className="mt-4 text-lg text-slate-300">
              {description ??
                `Free, no-pressure quotes for homeowners and builders in ${s.city} and nearby. Send photos and get a fast ballpark.`}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/quote" className={buttonClass('primary', 'lg')}>
              Get a free quote <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a href={telHref(s.phone)} className={buttonClass('secondary', 'lg', 'bg-white/10 text-white ring-white/20 hover:bg-white/20')}>
              <Phone className="size-4" aria-hidden="true" /> {formatPhone(s.phone)}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ContactButtons({ s, className }: { s: Settings; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row', className)}>
      <Link href="/quote" className={buttonClass('primary', 'lg')}>
        Get a free quote <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <a href={telHref(s.phone)} className={buttonClass('secondary', 'lg')}>
        <Phone className="size-4" aria-hidden="true" /> Call {formatPhone(s.phone)}
      </a>
      <a href={smsHref(s.phone)} className={buttonClass('ghost', 'lg', 'ring-1 ring-transparent')}>
        <MessageSquare className="size-4" aria-hidden="true" /> Text us
      </a>
    </div>
  )
}
