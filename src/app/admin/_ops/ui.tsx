import Link from 'next/link'
import type { ReactNode } from 'react'
import { Mail, MapPin, MessageSquare, Phone } from 'lucide-react'
import { buttonClass } from '@/components/ui'
import { cn, formatPhone, smsHref, telHref, titleCase } from '@/lib/utils'

export * from './constants'

export const label = titleCase

/** Reads a single string from Next's searchParams record. */
export function sp(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export function mapsUrl(...parts: (string | null | undefined)[]): string | null {
  const q = parts.filter(Boolean).join(', ')
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null
}

/** Horizontal, scrollable filter tabs (status filters on list pages). */
export function FilterTabs({ tabs }: { tabs: { label: string; href: string; active: boolean; count?: number }[] }) {
  return (
    <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
              t.active ? 'bg-surface text-slate-900 shadow-sm dark:bg-slate-200' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t.label}
            {t.count != null ? (
              <span className={cn('rounded-full px-1.5 text-xs', t.active ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/70 text-slate-500')}>
                {t.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  )
}

/** Big tap-friendly call / text / email / map buttons. */
export function ContactLinks({
  phone,
  email,
  address,
  city,
}: {
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
}) {
  const map = mapsUrl(address, city)
  if (!phone && !email && !map) return null
  return (
    <div className="flex flex-wrap gap-2">
      {phone ? (
        <>
          <a href={telHref(phone)} className={buttonClass('secondary', 'sm')}>
            <Phone className="size-4" /> Call
          </a>
          <a href={smsHref(phone)} className={buttonClass('secondary', 'sm')}>
            <MessageSquare className="size-4" /> Text
          </a>
        </>
      ) : null}
      {email ? (
        <a href={`mailto:${email}`} className={buttonClass('secondary', 'sm')}>
          <Mail className="size-4" /> Email
        </a>
      ) : null}
      {map ? (
        <a href={map} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary', 'sm')}>
          <MapPin className="size-4" /> Map
        </a>
      ) : null}
    </div>
  )
}

export function PhoneLink({ phone }: { phone: string | null | undefined }) {
  if (!phone) return <span className="text-slate-400">—</span>
  return (
    <a href={telHref(phone)} className="whitespace-nowrap text-slate-700 hover:text-brand-fg">
      {formatPhone(phone)}
    </a>
  )
}

/** Label/value pairs for detail pages. */
export function DetailList({ items }: { items: [string, ReactNode][] }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== '')
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {shown.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{k}</dt>
          <dd className="mt-0.5 break-words whitespace-pre-line text-slate-900">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'success'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'mb-5 rounded-lg px-4 py-3 text-sm ring-1 ring-inset',
        tone === 'info' && 'bg-blue-50 text-blue-800 ring-blue-200',
        tone === 'warn' && 'bg-amber-50 text-amber-800 ring-amber-200',
        tone === 'error' && 'bg-red-50 text-red-700 ring-red-200',
        tone === 'success' && 'bg-emerald-50 text-emerald-800 ring-emerald-200',
      )}
    >
      {children}
    </div>
  )
}

// Distinct, readable colors for jobs on the calendar (picked by job id).
const JOB_COLORS = [
  'bg-blue-100 text-blue-900 ring-blue-300',
  'bg-emerald-100 text-emerald-900 ring-emerald-300',
  'bg-violet-100 text-violet-900 ring-violet-300',
  'bg-amber-100 text-amber-900 ring-amber-300',
  'bg-cyan-100 text-cyan-900 ring-cyan-300',
  'bg-pink-100 text-pink-900 ring-pink-300',
  'bg-lime-100 text-lime-900 ring-lime-300',
  'bg-indigo-100 text-indigo-900 ring-indigo-300',
]
export function jobColor(id: number): string {
  return JOB_COLORS[id % JOB_COLORS.length]
}
export const BLOCK_COLOR = 'bg-slate-200 text-slate-700 ring-slate-300 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,color-mix(in_oklab,var(--surface)_50%,transparent)_6px,color-mix(in_oklab,var(--surface)_50%,transparent)_12px)]'
