import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { fulfillOrder } from '@/lib/vendor'

export async function POST(req: NextRequest) {
  const { orderId, adminPassword } = await req.json()

  if (adminPassword !== 'chaledata2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = createServiceClient()

  // Fix ALL stuck paid+pending orders at once
  if (orderId === 'all') {
    const { data: stuck } = await sb
      .from('orders')
      .select('id, phone, network, amount, paid_at, created_at')
      .eq('payment_status', 'paid')
      .in('vendor_status', ['pending', 'failed'])
      .limit(20)

    if (!stuck?.length) return NextResponse.json({ fixed: 0, message: 'No stuck orders found' })

    // Also fix missing customers
    for (const o of stuck) {
      const { data: existing } = await sb.from('customers').select('id').eq('phone', o.phone).maybeSingle()
      if (!existing) {
        await sb.from('customers').insert({
          phone: o.phone,
          network: o.network,
          total_purchases: 1,
          total_spent: Number(o.amount),
          last_purchase_at: o.paid_at || new Date().toISOString(),
          first_seen_at: o.created_at,
        })
      }
    }

    const results = await Promise.allSettled(stuck.map(o => fulfillOrder(o.id)))
    const fixed = results.filter(r => r.status === 'fulfilled').length
    return NextResponse.json({ fixed, total: stuck.length })
  }

  // Fix single order
  const { data: order } = await sb.from('orders').select('*').eq('id', orderId).single()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Fix missing customer record
  const { data: existing } = await sb.from('customers').select('id').eq('phone', order.phone).maybeSingle()
  if (!existing && order.payment_status === 'paid') {
    await sb.from('customers').insert({
      phone: order.phone,
      network: order.network,
      total_purchases: 1,
      total_spent: Number(order.amount),
      last_purchase_at: order.paid_at || new Date().toISOString(),
      first_seen_at: order.created_at,
    })
  }

  const result = await fulfillOrder(orderId)
  return NextResponse.json({ success: result.success, result })
}
