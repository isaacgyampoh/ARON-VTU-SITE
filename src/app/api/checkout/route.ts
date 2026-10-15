import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { normalisePhone, PHONE_FORMAT_HINT } from '@/lib/phone'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Orders one phone number may leave unpaid before it has to finish one. */
const PENDING_LIMIT = 6
const PENDING_WINDOW_MS = 15 * 60_000

export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 20, 5 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a moment.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const phone = body?.phone
  const network = body?.network
  const planId = body?.planId

  if (typeof phone !== 'string' || typeof network !== 'string' || typeof planId !== 'string') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const cleanPhone = normalisePhone(phone)
  if (!cleanPhone) {
    return NextResponse.json({ error: PHONE_FORMAT_HINT }, { status: 400 })
  }

  const sb = createServiceClient()

  // Get plan, with the network it belongs to
  const { data: plan, error: planErr } = await sb
    .from('data_plans')
    .select('id, name, data_amount, selling_price, cost_price, vendor_plan_id, is_active, networks(code, is_active)')
    .eq('id', planId)
    .single()

  if (planErr || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  // The price and the network come from the database, never from the request —
  // the client only ever names a plan.
  const planNetwork = Array.isArray(plan.networks) ? plan.networks[0] : plan.networks
  if (!plan.is_active || !planNetwork?.is_active) {
    return NextResponse.json({ error: 'This bundle is not available right now.' }, { status: 400 })
  }
  if (planNetwork.code !== network) {
    return NextResponse.json({ error: 'Plan does not belong to this network' }, { status: 400 })
  }
  if (!plan.selling_price || Number(plan.selling_price) <= 0) {
    return NextResponse.json({ error: 'Plan has no price set. Contact support.' }, { status: 400 })
  }

  // Stop one number filling the orders table with abandoned checkouts. This
  // counts in the database, so it holds across serverless instances.
  const since = new Date(Date.now() - PENDING_WINDOW_MS).toISOString()
  const { count: pending } = await sb
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('phone', cleanPhone)
    .eq('payment_status', 'pending')
    .gte('created_at', since)

  if ((pending ?? 0) >= PENDING_LIMIT) {
    return NextResponse.json(
      { error: 'You have several unfinished orders. Please complete or cancel one first.' },
      { status: 429 },
    )
  }

  const orderNo = 'CHL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
  const ref     = 'PAY-' + orderNo
  const sellingPrice = Number(plan.selling_price)
  const costPrice    = Number(plan.cost_price || 0)
  const amountPesewas = Math.round(sellingPrice * 100)

  const { error } = await sb
    .from('orders')
    .insert({
      order_no:       orderNo,
      phone:          cleanPhone,
      network:        planNetwork.code,
      plan_name:      plan.name,
      data_amount:    plan.data_amount,
      amount:         sellingPrice,
      cost_price:     costPrice,
      profit:         sellingPrice - costPrice,
      vendor_plan_id: plan.vendor_plan_id ?? null,
      paystack_ref:   ref,
      payment_status: 'pending',
      vendor_status:  'pending',
    })

  if (error) {
    // Logged in full for us; the customer gets nothing about the schema.
    console.error('[checkout] order insert failed:', JSON.stringify(error))
    return NextResponse.json({ error: 'Could not start this order. Please try again.' }, { status: 500 })
  }

  // Only what the payment step needs. The order row is not echoed back —
  // its id is a key to admin actions and has no business in the browser.
  return NextResponse.json({
    success: true,
    orderNo,
    paystack: {
      reference: ref,
      amount:    amountPesewas,
      email:     `${cleanPhone}@chaledata.com`,
      currency:  'GHS',
    },
  })
}
