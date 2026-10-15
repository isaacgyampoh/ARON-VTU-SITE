import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createServiceClient } from '@/lib/supabase'
import { fulfillOrder } from '@/lib/vendor'
import { env } from '@/lib/env'
import type { Order } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Timing-safe hex digest comparison. */
function signatureMatches(expected: string, received: string | null): boolean {
  if (!received || received.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
}

export async function POST(req: Request) {
  const body = await req.text()

  // Verify Paystack signature
  const hash = crypto
    .createHmac('sha512', env.paystackSecret)
    .update(body)
    .digest('hex')

  if (!signatureMatches(hash, req.headers.get('x-paystack-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)
  if (event.event !== 'charge.success' || event.data?.status !== 'success') {
    return NextResponse.json({ received: true })
  }

  const ref = event.data.reference
  const sb = createServiceClient()

  // Find order by paystack ref
  const { data: order, error: orderErr } = await sb
    .from('orders')
    .select('*')
    .eq('paystack_ref', ref)
    .single<Order>()

  if (orderErr || !order) {
    console.error('[webhook] order not found for ref:', ref, orderErr)
    return NextResponse.json({ received: true })
  }

  // The signature proves the message came from Paystack — not that the right
  // amount was paid. Without this check a GH¢1 charge against a pending
  // reference delivered a GH¢100 bundle.
  const expectedPesewas = Math.round(Number(order.amount) * 100)
  const paidPesewas = Number(event.data.amount)
  const currency = String(event.data.currency || '').toUpperCase()

  if (paidPesewas < expectedPesewas || currency !== 'GHS') {
    console.error(`[webhook] amount mismatch on ${order.order_no}: paid ${paidPesewas} ${currency}, expected ${expectedPesewas} GHS`)
    await sb.from('orders').update({
      vendor_status: 'manual_required',
      vendor_response: {
        note: `Payment did not match the order: received ${paidPesewas / 100} ${currency || '?'}, expected ${expectedPesewas / 100} GHS. Review before delivering.`,
      },
    }).eq('id', order.id)
    return NextResponse.json({ received: true, note: 'amount mismatch' })
  }

  // 1. Claim the order atomically. Paystack retries webhooks, and the previous
  // read-then-write left a window where two deliveries could both pass the
  // "already paid?" check and buy the bundle twice.
  const { data: claimed, error: claimErr } = await sb
    .from('orders')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', order.id)
    .eq('payment_status', 'pending')
    .select('id')

  if (claimErr) {
    console.error('[webhook] failed to mark order paid:', claimErr)
    return NextResponse.json({ error: 'Could not record payment' }, { status: 500 })
  }

  if (!claimed?.length) {
    // Someone else got there first — this is a duplicate delivery.
    return NextResponse.json({ received: true, note: 'already processed' })
  }

  // 2. Record the customer. The database function increments atomically; the
  // fallback keeps older installs working until the migration is run.
  const { error: rpcErr } = await sb.rpc('record_customer_purchase', {
    p_phone: order.phone,
    p_network: order.network,
    p_amount: Number(order.amount),
  })

  if (rpcErr) {
    const { data: existing } = await sb
      .from('customers').select('total_purchases, total_spent').eq('phone', order.phone).maybeSingle()

    if (existing) {
      await sb.from('customers').update({
        total_purchases: (existing.total_purchases || 0) + 1,
        total_spent: Number(existing.total_spent || 0) + Number(order.amount),
        last_purchase_at: new Date().toISOString(),
        network: order.network,
      }).eq('phone', order.phone)
    } else {
      await sb.from('customers').insert({
        phone: order.phone,
        network: order.network,
        total_purchases: 1,
        total_spent: Number(order.amount),
        last_purchase_at: new Date().toISOString(),
        first_seen_at: new Date().toISOString(),
      })
    }
  }

  // 3. Fulfill via vendor API — MUST await fully before returning
  // Vercel serverless kills the process on return, so we await here
  try {
    await fulfillOrder(order.id)
  } catch (e) {
    console.error('[webhook] vendor fulfillment error:', e)
    // Don't throw — order is paid, fulfillment can be retried from the admin.
  }

  return NextResponse.json({ success: true })
}
