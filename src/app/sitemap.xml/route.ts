import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const sb = createServiceClient()
  const { data: networks } = await sb.from('networks').select('code').eq('is_active', true)
  const base = 'https://aron-vtu-site.vercel.app'
  const urls = [
    `<url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${base}/order</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
    ...(networks || []).map(n =>
      `<url><loc>${base}/detail/${n.code}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    ),
  ]
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } }
  )
}
