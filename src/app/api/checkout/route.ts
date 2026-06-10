import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { phone, network, planId } = await req.json()

  if (!phone || !network || !planId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Clean phone → always 233XXXXXXXXX
  const cleanPhone = phone
    .replace(/\s+/g, '')
    .replace(/^\+233/, '233')
    .replace(/^\+/, '')
    .replace(/^0/, '233')

  if (!/^233\d{9}$/.test(cleanPhone)) {
    return NextResponse.json({ error: 'Invalid phone number. Use format: 024 000 0000' }, { status: 400 })
  }

  const sb = createServiceClient()

  // Get plan
  const { data: plan, error: planErr } = await sb
    .from('data_plans')
    .select('*, networks(name, code, type)')
    .eq('id', planId)
    .single()

  if (planErr || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (!plan.selling_price || plan.selling_price <= 0) {
    return NextResponse.json({ error: 'Plan has no price set. Contact support.' }, { status: 400 })
  }

  const orderNo = 'CHL-' + Date.now().toString(36).toUpperCase()
  const ref     = 'PAY-' + orderNo
  const amountPesewas = Math.round(Number(plan.selling_price) * 100)

  // Only insert columns that definitely exist in the orders table
  const orderData: Record<string, any> = {
    order_no:       orderNo,
    phone:          cleanPhone,
    network,
    plan_name:      plan.name,
    data_amount:    plan.data_amount,
    amount:         plan.selling_price,
    cost_price:     plan.cost_price || 0,
    profit:         (plan.selling_price || 0) - (plan.cost_price || 0),
    paystack_ref:   ref,
    payment_status: 'pending',
    vendor_status:  'pending',
  }

  // Conditionally add vendor_plan_id only if it has a value
  // (avoids error if column doesn't exist in DB yet)
  if (plan.vendor_plan_id) {
    orderData.vendor_plan_id = plan.vendor_plan_id
  }

  const { data: order, error } = await sb
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  if (error) {
    console.error('Order insert error:', JSON.stringify(error))
    // Return the actual DB error so you can see what's wrong
    return NextResponse.json({
      error: 'Failed to create order',
      detail: error.message,
      code: error.code,
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    order,
    paystack: {
      reference: ref,
      amount:    amountPesewas,
      email:     `${cleanPhone}@chaledata.com`,
      currency:  'GHS',
    },
  })
}
