import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CONTENT_TABS } from './constants'

/** Sub-navigation for the Website content section. Scrolls sideways on phones. */
export function ContentTabs({ active }: { active: (typeof CONTENT_TABS)[number]['href'] }) {
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Website content sections">
      <ul className="flex min-w-max gap-1 border-b border-slate-200">
        {CONTENT_TABS.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={t.href === active ? 'page' : undefined}
              className={cn(
                '-mb-px inline-block border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap',
                t.href === active ? 'border-brand text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800',
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
