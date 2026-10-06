import Link from 'next/link'
import { ArrowRight, Phone } from 'lucide-react'
import type { Settings } from '@/db/schema'
import { buttonClass } from '@/components/ui'
import { formatPhone, telHref } from '@/lib/utils'

export function NotFoundContent({ s }: { s: Settings }) {
  return (
    <section className="bg-drywall flex-1">
      <div className="container-x flex flex-col items-center py-24 text-center sm:py-32">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl">
          This page has a hole in it.
        </h1>
        <p className="mt-5 max-w-md text-lg text-slate-600">
          We couldn’t find what you were looking for. Luckily, patching things up is what we do.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={buttonClass('dark', 'lg')}>
            Back to home
          </Link>
          <Link href="/quote" className={buttonClass('primary', 'lg')}>
            Get a free quote <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <a href={telHref(s.phone)} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-brand">
          <Phone className="size-4" aria-hidden="true" /> Or call {formatPhone(s.phone)}
        </a>
      </div>
    </section>
  )
}
