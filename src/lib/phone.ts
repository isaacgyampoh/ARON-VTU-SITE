/**
 * One phone format for the whole system: 233XXXXXXXXX.
 *
 * Checkout and order-tracking used to normalise differently, so an order placed
 * as "+233 24 000 0000" could never be found again by the customer.
 */

export function normalisePhone(input: string): string | null {
  const digits = String(input || '').replace(/[\s\-()]/g, '')
  const local = digits
    .replace(/^\+233/, '233')
    .replace(/^\+/, '')
    .replace(/^00233/, '233')
    .replace(/^0/, '233')
  return /^233\d{9}$/.test(local) ? local : null
}

export const PHONE_FORMAT_HINT = 'Invalid phone number. Use format: 024 000 0000'
