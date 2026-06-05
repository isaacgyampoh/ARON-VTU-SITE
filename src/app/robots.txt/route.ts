export async function GET() {
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://chaledata.com/sitemap.xml`,
    { headers: { 'Content-Type': 'text/plain' } }
  )
}
