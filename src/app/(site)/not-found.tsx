import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import { NotFoundContent } from './_components/not-found-content'

export const metadata: Metadata = { title: 'Page not found', robots: { index: false } }

/** 404 for notFound() calls inside the public site (e.g. an unknown /areas/[slug]); keeps the header & footer. */
export default async function SiteNotFound() {
  return <NotFoundContent s={await getSettings()} />
}
