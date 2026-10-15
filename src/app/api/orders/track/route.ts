import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { normalisePhone, PHONE_FORMAT_HINT } from '@/lib/phone'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import type { TrackedOrder } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Order history for one phone number.
 *
 * The tracking page used to read the orders table straight from the browser
 * with the anon key, which returned every column — cost price and profit
 * included — and, with row level security as it was, every other customer's
 * orders too. This returns a fixed, safe set of fields for one number only.
 *
 * Knowing a number is still enough to see its orders. That matches how the page
 * has always worked; a one-time code would be the way to close it properly.
 */
export async function POST(req: Request) {
  if (!rateLimit(`track:${clientIp(req)}`, 30, 5 * 60_000)) {
    return NextResponse.json({ error: 'Too many lookups. Please wait a moment.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const phone = normalisePhone(typeof body?.phone === 'string' ? body.phone : '')
  if (!phone) {
    return NextResponse.json({ error: PHONE_FORMAT_HINT }, { status: 400 })
  }

  const sb = createServiceClient()
  const { data, error } = await sb
    .from('orders')
    .select('id, order_no, network, plan_name, data_amount, amount, payment_status, vendor_status, created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('[track] read failed:', error)
    return NextResponse.json({ error: 'Could not look that up right now.' }, { status: 500 })
  }

  return NextResponse.json({ orders: (data ?? []) as TrackedOrder[] })
}
