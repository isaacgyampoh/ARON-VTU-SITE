import type { MetadataRoute } from 'next'
import { getActiveNetworks } from '@/lib/shop'
import { env } from '@/lib/env'

export const revalidate = 60

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl()
  const networks = await getActiveNetworks()

  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/order`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/cresco`, changeFrequency: 'monthly', priority: 0.4 },
    ...networks.map(n => ({
      url: `${base}/detail/${n.code}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
