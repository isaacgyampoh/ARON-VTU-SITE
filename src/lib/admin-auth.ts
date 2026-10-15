import crypto from 'node:crypto'
import { env } from './env'

/**
 * Admin sessions.
 *
 * The password used to be compared in the browser, which meant it shipped
 * inside the JavaScript bundle for anyone to read. It is now checked on the
 * server, and the browser only ever holds a signed, expiring token in an
 * httpOnly cookie that JavaScript cannot read.
 */

export const ADMIN_COOKIE = 'cd_admin'
const MAX_AGE_SECONDS = 60 * 60 * 8 // 8 hours

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

/** Constant-time compare that does not leak length through an exception. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export function createSessionToken(secret = env.adminSessionSecret): string {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000
  const payload = String(expiresAt)
  return `${payload}.${sign(payload, secret)}`
}

export function verifySessionToken(token: string | undefined, secret = env.adminSessionSecret): boolean {
  if (!token) return false
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return false

  const payload = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  if (!safeEqual(signature, sign(payload, secret))) return false

  const expiresAt = Number(payload)
  return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

/** Checks a submitted password without leaking its length via timing. */
export function passwordMatches(submitted: unknown, expected = env.adminPassword): boolean {
  if (typeof submitted !== 'string' || !submitted) return false
  const a = crypto.createHash('sha256').update(submitted).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(a, b)
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
}
