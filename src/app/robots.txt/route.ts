export async function GET() {
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://aron-vtu-site.vercel.app/sitemap.xml`,
    { headers: { 'Content-Type': 'text/plain' } }
  )
}
