import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET — recent orders, newest first. */
export async function GET(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const params = new URL(req.url).searchParams
  const limit = Math.min(Number(params.get('limit')) || 200, 1000)

  const sb = createServiceClient()
  const { data, error } = await sb
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[admin/orders] read failed:', error)
    return NextResponse.json({ error: 'Could not load orders.' }, { status: 500 })
  }
  return NextResponse.json({ data: data ?? [] })
}

/**
 * PATCH — the two manual corrections the admin needs.
 *
 * Deliberately not a general column update: marking an order paid or delivered
 * moves money and data, so only these two named transitions are possible.
 */
export async function PATCH(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const { id, action } = body as { id?: unknown; action?: unknown }

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const sb = createServiceClient()
  const now = new Date().toISOString()

  if (action === 'mark_fulfilled') {
    const { error } = await sb.from('orders').update({
      vendor_status: 'success',
      fulfilled_at: now,
      vendor_api_used: 'manual',
    }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  if (action === 'mark_paid') {
    // Only ever moves pending → paid, so this cannot silently undo a refund or
    // re-open an order the webhook has already settled.
    const { data, error } = await sb.from('orders')
      .update({ payment_status: 'paid', paid_at: now })
      .eq('id', id)
      .eq('payment_status', 'pending')
      .select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data?.length) {
      return NextResponse.json({ error: 'That order is no longer pending.' }, { status: 409 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
