/**
 * Guards outbound requests to addresses that came from the database.
 *
 * The vendor "test connection" button fetches whatever URL is stored on the
 * vendor row. Even with the admin locked down, that should never be able to
 * reach the machine the app runs on or the cloud metadata service.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost', '127.0.0.1', '0.0.0.0', '::1',
  '169.254.169.254',            // cloud instance metadata
  'metadata.google.internal',
])

function isPrivateIPv4(host: string): boolean {
  const parts = host.split('.')
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p))) return false
  const [a, b] = parts.map(Number)
  if (a === 10 || a === 127) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true
  return false
}

export function assertSafeExternalUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('That is not a valid URL.')
  }

  if (url.protocol !== 'https:') {
    throw new Error('Only https addresses are allowed.')
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (BLOCKED_HOSTNAMES.has(host) || isPrivateIPv4(host) || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new Error('That address is not reachable from here.')
  }

  return url
}
