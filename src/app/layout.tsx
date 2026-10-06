import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import type { CSSProperties } from 'react'
import { getSettings, appUrl } from '@/lib/settings'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  const title = `${s.businessName} | Drywall Installation, Finishing & Repair in ${s.city}, ${s.state}`
  return {
    metadataBase: new URL(appUrl()),
    title: { default: title, template: `%s | ${s.businessName}` },
    description: `${s.heroSubhead} Licensed & insured. Free quotes in ${s.city} and surrounding areas.`,
    openGraph: { type: 'website', siteName: s.businessName, title, locale: 'en_US' },
  }
}

export const viewport: Viewport = { themeColor: '#0f172a' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings()
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-dvh font-sans" style={{ '--brand': s.accentColor } as CSSProperties}>
        {children}
      </body>
    </html>
  )
}
