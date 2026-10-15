import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, verifySessionToken } from './admin-auth'

/**
 * Re-checks the admin session inside a route handler.
 *
 * The proxy already blocks unauthenticated requests, but a matcher change or a
 * moved file would silently remove that cover, so every admin route checks for
 * itself as well. Returns null when the caller is allowed through.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const jar = await cookies()
  if (verifySessionToken(jar.get(ADMIN_COOKIE)?.value)) return null
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
