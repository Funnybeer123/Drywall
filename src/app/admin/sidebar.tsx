'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  BarChart3,
  BookOpen,
  Calendar,
  FileText,
  Hammer,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShoppingCart,
  Tag,
  UserPlus,
  Users,
  X,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NavItem } from './nav'

const ICONS = {
  'layout-dashboard': LayoutDashboard,
  inbox: Inbox,
  'file-text': FileText,
  hammer: Hammer,
  calendar: Calendar,
  users: Users,
  receipt: Receipt,
  'shopping-cart': ShoppingCart,
  'bar-chart': BarChart3,
  image: ImageIcon,
  tag: Tag,
  'user-plus': UserPlus,
  settings: Settings,
} as const

export function Sidebar({
  nav,
  businessName,
  user,
  newLeads,
  logout,
}: {
  nav: { section: string; items: NavItem[] }[]
  businessName: string
  user: { name: string; roleLabel: string }
  newLeads: number
  logout: () => Promise<void>
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/admin" className="truncate text-base font-bold text-white" onClick={() => setOpen(false)}>
          {businessName}
        </Link>
        <button className="text-slate-400 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {nav.map((group) => (
          <div key={group.section}>
            <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{group.section}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon as keyof typeof ICONS] ?? LayoutDashboard
                const active = isActive(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      <Icon className={cn('size-4', active && 'text-brand')} />
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/admin/leads' && newLeads > 0 ? (
                        <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{newLeads}</span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link href="/" target="_blank" className="mb-1 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
          <ExternalLink className="size-4" /> View website
        </Link>
        <Link href="/howto" target="_blank" className="mb-1 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
          <BookOpen className="size-4" /> How-to guide
        </Link>
        <div className="flex items-center justify-between gap-2 px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-slate-400">{user.roleLabel}</p>
          </div>
          <form action={logout}>
            <button className="rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Sign out" title="Sign out">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="-ml-1 rounded-md p-1.5 text-slate-700 hover:bg-slate-100">
          <Menu className="size-5" />
        </button>
        <span className="truncate font-semibold">{businessName}</span>
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-slate-900">{content}</aside>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-20 hidden w-64 bg-slate-900 lg:block">{content}</aside>
    </>
  )
}
