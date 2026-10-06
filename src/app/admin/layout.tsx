import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { can, ROLE_LABELS } from '@/lib/permissions'
import { getSettings } from '@/lib/settings'
import { leadCountNew } from '@/lib/notify'
import { logoutAction } from '../login/actions'
import { NAV } from './nav'
import { Sidebar } from './sidebar'

export const metadata: Metadata = { title: { default: 'Dashboard', template: '%s · Admin' }, robots: { index: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const s = await getSettings()
  const nav = NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(user, i.permission)) })).filter((g) => g.items.length)
  const newLeads = can(user, 'leads:manage') ? await leadCountNew() : 0

  return (
    <div className="min-h-dvh bg-slate-50">
      <Sidebar
        nav={nav}
        businessName={s.businessName}
        user={{ name: user.name, roleLabel: ROLE_LABELS[user.role] }}
        newLeads={newLeads}
        logout={logoutAction}
      />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  )
}
