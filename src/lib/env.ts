/**
 * Environment access in one place, so a missing variable fails with a message
 * that says which one — instead of a Supabase "supabaseUrl is required" stack
 * trace at build time.
 */

function read(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n]
    if (v && v.trim()) return v.trim()
  }
  return ''
}

function required(value: string, name: string): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  get supabaseUrl() {
    return required(read('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'), 'SUPABASE_URL')
  },
  get supabaseServiceKey() {
    return required(read('SUPABASE_SERVICE_ROLE_KEY'), 'SUPABASE_SERVICE_ROLE_KEY')
  },
  get paystackSecret() {
    return required(read('PAYSTACK_SECRET_KEY'), 'PAYSTACK_SECRET_KEY')
  },
  get adminPassword() {
    return required(read('ADMIN_PASSWORD'), 'ADMIN_PASSWORD')
  },
  /** Signs the admin session cookie. Falls back to the Paystack secret so an
   *  existing deployment keeps working, but set it explicitly in production. */
  get adminSessionSecret() {
    return required(read('ADMIN_SESSION_SECRET', 'PAYSTACK_SECRET_KEY'), 'ADMIN_SESSION_SECRET')
  },
  /** Fallbacks only — the values saved in the admin always win. */
  vendorFallbackKey: () => read('VENDOR_API_KEY'),
  vendorFallbackUrl: () => read('VENDOR_BASE_URL') || 'https://www.xpresportal.app/api/v1',
  siteUrl: () => read('NEXT_PUBLIC_SITE_URL') || 'https://chaledata.com',
}
