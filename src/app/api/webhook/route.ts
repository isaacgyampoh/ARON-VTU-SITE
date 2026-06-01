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

  // Find order
  const { data: order } = await sb
    .from('orders')
    .select('*')
    .eq('paystack_ref', ref)
    .single()

  if (!order) {
    console.error('[webhook] order not found for ref:', ref)
    return NextResponse.json({ received: true })
  }

  // Idempotency — skip if already processed
  if (order.payment_status === 'paid') {
    return NextResponse.json({ received: true, note: 'already processed' })
  }

  // Mark paid + upsert customer in one go (parallel)
  await Promise.all([
    sb.from('orders').update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', order.id),

    sb.rpc('upsert_customer_stats', {
      p_phone: order.phone,
      p_network: order.network,
      p_amount: order.amount,
    }).then(({ error }) => {
      if (error) {
        // Fallback: manual upsert if RPC doesn't exist yet
        return sb.from('customers').upsert({
          phone: order.phone,
          network: order.network,
          total_purchases: 1,
          total_spent: Number(order.amount),
          last_purchase_at: new Date().toISOString(),
        }, { onConflict: 'phone', ignoreDuplicates: false })
      }
    }),
  ])

  // Fire vendor fulfillment — don't await (respond to Paystack immediately)
  // Vercel Edge keeps the process alive via waitUntil if available
  fulfillOrder(order.id).catch(e =>
    console.error('[webhook] fulfillment error:', e)
  )

  return NextResponse.json({ success: true })
}
