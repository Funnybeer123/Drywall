import type { MetadataRoute } from 'next'
import { appUrl } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/login', '/i/', '/e/', '/invite/', '/api/', '/quote/thanks'],
    },
    sitemap: appUrl('/sitemap.xml'),
    host: appUrl(),
  }
}
