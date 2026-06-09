import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { fulfillOrder } from '@/lib/vendor'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.text()

  // Verify Paystack signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== req.headers.get('x-paystack-signature')) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)
  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const ref = event.data.reference
  const sb = createServiceClient()

  // Find order by paystack ref
  const { data: order, error: orderErr } = await sb
    .from('orders')
    .select('*')
    .eq('paystack_ref', ref)
    .single()

  if (orderErr || !order) {
    console.error('[webhook] order not found for ref:', ref, orderErr)
    return NextResponse.json({ received: true })
  }

  // Idempotency — skip if already processed
  if (order.payment_status === 'paid') {
    return NextResponse.json({ received: true, note: 'already processed' })
  }

  // 1. Mark order as paid
  const { error: updateErr } = await sb
    .from('orders')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (updateErr) {
    console.error('[webhook] failed to mark order paid:', updateErr)
  }

  // 2. Upsert customer — check if exists first, then increment properly
  const { data: existing } = await sb
    .from('customers')
    .select('*')
    .eq('phone', order.phone)
    .maybeSingle()

  if (existing) {
    await sb.from('customers').update({
      total_purchases: (existing.total_purchases || 0) + 1,
      total_spent: Number(existing.total_spent || 0) + Number(order.amount),
      last_purchase_at: new Date().toISOString(),
      network: order.network, // update to most recent network used
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

  // 3. Fulfill via vendor API — MUST await fully before returning
  // Vercel serverless kills the process on return, so we await here
  try {
    await fulfillOrder(order.id)
  } catch (e) {
    console.error('[webhook] vendor fulfillment error:', e)
    // Don't throw — order is paid, fulfillment can be retried manually
  }

  return NextResponse.json({ success: true })
}
