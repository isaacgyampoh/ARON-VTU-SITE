import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { fulfillOrder } from '@/lib/vendor'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.text()
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

  const pd = event.data
  const ref = pd.reference
  const sb = createServiceClient()

  // Find order by paystack ref
  const { data: order } = await sb.from('orders').select('*').eq('paystack_ref', ref).single()
  if (!order) {
    console.error('Webhook: order not found for ref', ref)
    return NextResponse.json({ received: true })
  }

  if (order.payment_status === 'paid') {
    return NextResponse.json({ received: true, note: 'already processed' })
  }

  // Mark as paid
  await sb.from('orders').update({
    payment_status: 'paid',
    paid_at: new Date().toISOString(),
  }).eq('id', order.id)

  // Update customer record
  await sb.from('customers').upsert({
    phone: order.phone,
    network: order.network,
    total_purchases: 1,
    total_spent: order.amount,
    last_purchase_at: new Date().toISOString(),
  }, {
    onConflict: 'phone',
  })

  // Increment existing customer stats
  const { data: cust } = await sb.from('customers').select('*').eq('phone', order.phone).single()
  if (cust) {
    await sb.from('customers').update({
      total_purchases: (cust.total_purchases || 0) + 1,
      total_spent: Number(cust.total_spent || 0) + Number(order.amount),
      last_purchase_at: new Date().toISOString(),
      network: order.network,
    }).eq('phone', order.phone)
  }

  // Fulfill via vendor API
  try {
    await fulfillOrder(order.id)
  } catch (e) {
    console.error('Vendor fulfillment error:', e)
  }

  return NextResponse.json({ success: true })
}
