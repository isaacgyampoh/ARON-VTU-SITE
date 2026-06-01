import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { phone, network, planId } = await req.json()

  if (!phone || !network || !planId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Clean phone → always 233XXXXXXXXX format
  const cleanPhone = phone
    .replace(/\s+/g, '')      // remove spaces
    .replace(/^\+233/, '233') // +233XX → 233XX
    .replace(/^\+/, '')       // other +XX
    .replace(/^0/, '233')     // 0XX → 233XX

  // Must be 12 digits: 233 + 9-digit number
  if (!/^233\d{9}$/.test(cleanPhone)) {
    return NextResponse.json({ error: 'Invalid phone number. Use format: 024 000 0000' }, { status: 400 })
  }

  const sb = createServiceClient()

  // Get plan
  const { data: plan, error: planErr } = await sb
    .from('data_plans')
    .select('*, networks(name, code)')
    .eq('id', planId)
    .single()

  if (planErr || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (!plan.selling_price || plan.selling_price <= 0) {
    return NextResponse.json({ error: 'Plan has no price set. Contact support.' }, { status: 400 })
  }

  // Create order
  const orderNo = 'CHL-' + Date.now().toString(36).toUpperCase()
  const ref = 'PAY-' + orderNo

  // Amount in pesewas (GHS × 100), must be integer
  const amountPesewas = Math.round(Number(plan.selling_price) * 100)

  const { data: order, error } = await sb.from('orders').insert({
    order_no: orderNo,
    phone: cleanPhone,
    network,
    plan_name: plan.name,
    data_amount: plan.data_amount,
    amount: plan.selling_price,
    cost_price: plan.cost_price,
    profit: plan.selling_price - plan.cost_price,
    paystack_ref: ref,
    payment_status: 'pending',
    vendor_status: 'pending',
  }).select().single()

  if (error) {
    console.error('Order insert error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    order,
    paystack: {
      reference: ref,
      amount: amountPesewas,
      email: `${cleanPhone}@chaledata.com`,
      currency: 'GHS',
    }
  })
}
