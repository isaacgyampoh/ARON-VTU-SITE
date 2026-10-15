import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, createSessionToken, passwordMatches, sessionCookieOptions } from '@/lib/admin-auth'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST — exchange the admin password for a signed session cookie. */
export async function POST(req: Request) {
  if (!rateLimit(`login:${clientIp(req)}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))

  let ok = false
  try {
    ok = passwordMatches(body?.password)
  } catch {
    // ADMIN_PASSWORD is not configured — refuse rather than let everyone in.
    return NextResponse.json({ error: 'Admin login is not configured on the server.' }, { status: 500 })
  }

  if (!ok) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set(ADMIN_COOKIE, createSessionToken(), sessionCookieOptions)
  return res
}

/** DELETE — sign out. */
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(ADMIN_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
  return res
}
