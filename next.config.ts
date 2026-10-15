import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/networks/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, immutable' }],
      },
    ]
  },
}

export default nextConfig

// Gives `next dev` the same Cloudflare bindings the deployed worker gets, so
// local development and production read their configuration the same way.
// No-op outside of `next dev`.
void import('@opennextjs/cloudflare').then((m) => m.initOpenNextCloudflareForDev())
