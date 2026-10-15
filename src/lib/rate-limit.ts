/**
 * Small fixed-window rate limiter.
 *
 * In memory, so on serverless it limits per running instance rather than
 * globally — enough to blunt a password guesser or an order-spam script, not a
 * substitute for a shared store if traffic grows. Checkout additionally limits
 * per phone number in the database, which is not instance-local.
 */
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 5000) sweep(now)
    return true
  }

  if (existing.count >= limit) return false
  existing.count += 1
  return true
}

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/** Best-effort caller identity behind a proxy or CDN. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
