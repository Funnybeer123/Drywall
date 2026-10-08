import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import { Brand } from './(site)/_components/chrome'
import { NotFoundContent } from './(site)/_components/not-found-content'

export const metadata: Metadata = { title: 'Page not found', robots: { index: false } }

/** Global 404 for unmatched URLs (rendered inside the root layout only). */
export default async function NotFound() {
  const s = await getSettings()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-slate-200 bg-surface">
        <div className="container-x flex h-16 items-center">
          <Brand s={s} />
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <NotFoundContent s={s} />
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {s.businessName}
      </footer>
    </div>
  )
}
