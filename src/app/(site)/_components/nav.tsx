'use client'

import { NAV_LINKS } from './nav-links'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Menu, Phone, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export function DesktopNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
      {NAV_LINKS.map((l) => {
        const active = isActive(pathname, l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            <span className={cn('border-b-2 pb-0.5', active ? 'border-brand' : 'border-transparent')}>{l.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function MobileNav({ phone, phoneHref }: { phone: string; phoneHref: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Lock page scroll and allow Esc to close while the menu is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="inline-flex size-10 items-center justify-center rounded-lg text-slate-700 ring-1 ring-slate-200 ring-inset hover:bg-slate-50"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Portaled to <body>: the header's backdrop-filter would otherwise trap `position: fixed`. */}
      {open ? createPortal(
        <div id="mobile-menu" className="fixed inset-x-0 top-16 bottom-0 z-[45] overflow-y-auto bg-white lg:hidden">
          <nav aria-label="Mobile" className="container-x flex flex-col py-4">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center justify-between border-b border-slate-100 py-4 text-lg font-semibold',
                pathname === '/' ? 'text-brand' : 'text-slate-900',
              )}
            >
              Home
            </Link>
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(pathname, l.href) ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between border-b border-slate-100 py-4 text-lg font-semibold',
                  isActive(pathname, l.href) ? 'text-brand' : 'text-slate-900',
                )}
              >
                {l.label}
                <ArrowRight className="size-4 text-slate-300" aria-hidden="true" />
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-b border-slate-100 py-4 text-lg font-semibold text-slate-900"
            >
              Contact
              <ArrowRight className="size-4 text-slate-300" aria-hidden="true" />
            </Link>
            <div className="mt-6 grid gap-3">
              <Link
                href="/quote"
                onClick={() => setOpen(false)}
                className="inline-flex h-12 items-center justify-center rounded-lg bg-brand px-6 font-semibold text-white hover:bg-brand-dark"
              >
                Get a free quote
              </Link>
              <a
                href={phoneHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 font-semibold text-slate-900 ring-1 ring-slate-300 ring-inset"
              >
                <Phone className="size-4" aria-hidden="true" /> Call {phone}
              </a>
            </div>
          </nav>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
