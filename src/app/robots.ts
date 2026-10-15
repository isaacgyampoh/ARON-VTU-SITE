import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  const base = env.siteUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The admin is behind a login, but there is no reason to advertise it.
      disallow: ['/admin', '/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
