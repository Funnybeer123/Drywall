import Link from 'next/link'
import { FileText, MessageSquare, Phone, ShieldCheck } from 'lucide-react'
import type { Settings } from '@/db/schema'
import { buttonClass } from '@/components/ui'
import { formatPhone, smsHref, telHref } from '@/lib/utils'
import { parseWorkDays } from '@/lib/availability'
import { DesktopNav, MobileNav } from './nav'
import { NAV_LINKS } from './nav-links'
import { FacebookIcon, GoogleIcon, InstagramIcon } from './icons'

type Area = { slug: string; city: string; state: string }

export function Brand({ s }: { s: Settings }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={`${s.businessName} home`}>
      {s.logoUrl ? (
        <img src={s.logoUrl} alt="" className="h-9 w-auto max-w-[140px] object-contain" />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-900 text-base font-bold text-white"
        >
          {s.businessName.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="truncate text-[17px] leading-tight font-bold tracking-tight text-slate-900">{s.businessName}</span>
    </Link>
  )
}

export function SiteHeader({ s }: { s: Settings }) {
  const phone = formatPhone(s.phone)
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-x flex h-16 items-center justify-between gap-3">
        <Brand s={s} />
        <DesktopNav />
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={telHref(s.phone)}
            className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 md:inline-flex"
          >
            <Phone className="size-4 text-brand" aria-hidden="true" />
            {phone}
          </a>
          <a
            href={telHref(s.phone)}
            aria-label={`Call ${phone}`}
            className="inline-flex size-10 items-center justify-center rounded-lg text-slate-900 ring-1 ring-slate-200 ring-inset hover:bg-slate-50 md:hidden"
          >
            <Phone className="size-4" aria-hidden="true" />
          </a>
          <Link href="/quote" className={buttonClass('primary', 'md', 'hidden sm:inline-flex')}>
            Free Quote
          </Link>
          <MobileNav phone={phone} phoneHref={telHref(s.phone)} />
        </div>
      </div>
    </header>
  )
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** "Mon–Fri" / "Mon–Sat" / "Mon, Wed, Fri" from the settings work-days string. */
export function workDaysLabel(workDays: string): string {
  const days = [...new Set(parseWorkDays(workDays))].sort((a, b) => a - b)
  if (days.length === 0) return 'By appointment'
  if (days.length === 7) return 'Every day'
  const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1)
  if (contiguous && days.length >= 3) return `${DAY_NAMES[days[0]]}–${DAY_NAMES[days[days.length - 1]]}`
  return days.map((d) => DAY_NAMES[d]).join(', ')
}

export function SiteFooter({ s, areas }: { s: Settings; areas: Area[] }) {
  const year = new Date().getFullYear()
  const socials = [
    s.facebookUrl && { href: s.facebookUrl, label: 'Facebook', Icon: FacebookIcon },
    s.instagramUrl && { href: s.instagramUrl, label: 'Instagram', Icon: InstagramIcon },
    s.googleReviewUrl && { href: s.googleReviewUrl, label: 'Google reviews', Icon: GoogleIcon },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof FacebookIcon }[]

  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="text-lg font-bold text-white">{s.businessName}</p>
          <p className="mt-2 max-w-xs text-sm text-slate-400">{s.tagline}</p>
          <ul className="mt-5 space-y-2 text-sm">
            <li>
              <a href={telHref(s.phone)} className="inline-flex items-center gap-2 font-semibold text-white hover:text-brand">
                <Phone className="size-4" aria-hidden="true" /> {formatPhone(s.phone)}
              </a>
            </li>
            <li>
              <a href={`mailto:${s.email}`} className="hover:text-white">
                {s.email}
              </a>
            </li>
            <li className="text-slate-400">
              {s.address ? `${s.address}, ` : ''}
              {s.city}, {s.state}
            </li>
          </ul>
          {socials.length > 0 ? (
            <div className="mt-5 flex gap-2">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-lg bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <p className="text-sm font-semibold text-white">Company</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/contact" className="hover:text-white">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <p className="text-sm font-semibold text-white">Service areas</p>
          {areas.length > 0 ? (
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm lg:grid-cols-1">
              {areas.map((a) => (
                <li key={a.slug}>
                  <Link href={`/areas/${a.slug}`} className="hover:text-white">
                    {a.city}, {a.state}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm">
              {s.city}, {s.state} and surrounding areas
            </p>
          )}
        </div>

        <div className="lg:col-span-3">
          <p className="text-sm font-semibold text-white">Hours & credentials</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>Crew schedule: {workDaysLabel(s.workDays)}</li>
            {s.insured ? (
              <li className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400" aria-hidden="true" /> Licensed & insured
              </li>
            ) : null}
            {s.licenseNumber ? <li>License #{s.licenseNumber}</li> : null}
            <li>{s.yearsInBusiness}+ years in business</li>
          </ul>
          <Link href="/quote" className={buttonClass('primary', 'md', 'mt-6')}>
            Request a free quote
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {s.businessName}. All rights reserved.
          </p>
          <Link href="/login" className="hover:text-slate-300">
            Team login
          </Link>
        </div>
      </div>
    </footer>
  )
}

/** Thumb-reachable call / text / quote bar. Only on small screens. */
export function MobileCtaBar({ s }: { s: Settings }) {
  const item = 'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold'
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex h-16 items-stretch gap-2 px-3 py-2">
        <a href={telHref(s.phone)} className={`${item} rounded-lg text-slate-900 ring-1 ring-slate-200 ring-inset`}>
          <Phone className="size-5" aria-hidden="true" />
          Call
        </a>
        <a href={smsHref(s.phone)} className={`${item} rounded-lg text-slate-900 ring-1 ring-slate-200 ring-inset`}>
          <MessageSquare className="size-5" aria-hidden="true" />
          Text
        </a>
        <Link href="/quote" className={`${item} flex-[1.6] rounded-lg bg-brand text-white`}>
          <FileText className="size-5" aria-hidden="true" />
          Get Quote
        </Link>
      </div>
    </div>
  )
}
