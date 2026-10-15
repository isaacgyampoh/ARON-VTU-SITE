import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { fulfillOrder } from '@/lib/vendor'
import { requireAdmin } from '@/lib/require-admin'
import type { Order } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Retries paid orders that never reached the vendor, and backfills the customer
 * record if the webhook died before writing it.
 *
 * The password that used to guard this was hardcoded here and in the browser
 * bundle; the admin session cookie guards it now.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const orderId = body?.orderId
  if (typeof orderId !== 'string') {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
  }

  const sb = createServiceClient()

  async function ensureCustomer(o: Pick<Order, 'phone' | 'network' | 'amount' | 'paid_at' | 'created_at'>) {
    const { data: existing } = await sb.from('customers').select('id').eq('phone', o.phone).maybeSingle()
    if (existing) return
    await sb.from('customers').insert({
      phone: o.phone,
      network: o.network,
      total_purchases: 1,
      total_spent: Number(o.amount),
      last_purchase_at: o.paid_at || new Date().toISOString(),
      first_seen_at: o.created_at,
    })
  }

  // Fix ALL stuck paid+pending orders at once
  if (orderId === 'all') {
    const { data: stuck } = await sb
      .from('orders')
      .select('id, phone, network, amount, paid_at, created_at')
      .eq('payment_status', 'paid')
      .in('vendor_status', ['pending', 'failed'])
      .limit(20)

    if (!stuck?.length) return NextResponse.json({ fixed: 0, total: 0, message: 'No stuck orders found' })

    for (const o of stuck) await ensureCustomer(o)

    // Count orders actually delivered, not merely calls that did not throw.
    const results = await Promise.allSettled(stuck.map(o => fulfillOrder(o.id)))
    const fixed = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    return NextResponse.json({ fixed, total: stuck.length })
  }

  // Fix single order
  const { data: order } = await sb.from('orders').select('*').eq('id', orderId).single<Order>()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (order.payment_status === 'paid') await ensureCustomer(order)

  const result = await fulfillOrder(orderId)
  return NextResponse.json({ success: result.success, result })
}
