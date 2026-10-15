import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifySessionToken } from '@/lib/admin-auth'

/**
 * Server-side gate for everything under /admin.
 *
 * Previously the admin was guarded by a password compared in the browser, so
 * the API routes behind it were open to anyone who knew the URL. This runs
 * before the route does, on the server, and cannot be skipped from the client.
 *
 * Each protected route still re-checks the session itself (see requireAdmin) —
 * the proxy is the first line, not the only one.
 */

const LOGIN_PAGE = '/admin/login'
const PUBLIC_ADMIN_PATHS = new Set([LOGIN_PAGE, '/api/admin/login'])

function isProtected(pathname: string): boolean {
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return false
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/api/admin/') ||
    pathname.startsWith('/api/vendor')
  )
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!isProtected(pathname)) return NextResponse.next()

  if (verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.next()
  }

  // API callers get a status they can act on; people get the login page.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const login = new URL(LOGIN_PAGE, request.url)
  if (pathname !== '/admin') login.searchParams.set('next', pathname)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*', '/api/vendor/:path*', '/api/vendor'],
}
