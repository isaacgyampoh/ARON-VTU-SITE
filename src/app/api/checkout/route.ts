import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { phone, network, planId } = await req.json()

  if (!phone || !network || !planId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate phone
  const cleanPhone = phone.replace(/\s+/g, '').replace(/^0/, '233').replace(/^\+/, '')
  if (cleanPhone.length < 10) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  const sb = createServiceClient()

  // Get plan
  const { data: plan } = await sb.from('data_plans').select('*, networks(name, code)').eq('id', planId).single()
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  // Create order
  const orderNo = 'ARN-' + Date.now().toString(36).toUpperCase()
  const ref = 'PAY-' + orderNo

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
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    order: order,
    paystack: {
      reference: ref,
      amount: Math.round(plan.selling_price * 100), // pesewas
      email: cleanPhone + '@aronvtu.com',
      currency: 'GHS',
    }
  })
}
