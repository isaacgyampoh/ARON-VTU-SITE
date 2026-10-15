import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { fulfillOrder } from '@/lib/vendor'
import { requireAdmin } from '@/lib/require-admin'
import { assertSafeExternalUrl } from '@/lib/safe-url'
import type { VendorApi } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/vendor?action=test  — test a stored vendor connection
// POST /api/vendor?action=retry — retry fulfilment for a paid order
//
// Both used to be open to anyone. "retry" in particular bought real data from
// the vendor for any order id handed to it.
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const action = new URL(req.url).searchParams.get('action')
  const body = await req.json().catch(() => ({}))
  const sb = createServiceClient()

  if (action === 'test') {
    const { data: vendor } = await sb
      .from('vendor_apis').select('*').eq('id', body.vendorId).single<VendorApi>()
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })

    try {
      const target = assertSafeExternalUrl(
        `${vendor.base_url.replace(/\/$/, '')}${vendor.purchase_endpoint}`,
      )

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(vendor.headers || {}),
      }
      if (vendor.api_key) headers['Authorization'] = `Bearer ${vendor.api_key}`

      const res = await fetch(target, {
        method: 'POST',
        headers,
        body: JSON.stringify({ test: true }),
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      })
      const text = await res.text()

      await sb.from('vendor_apis').update({
        status: res.ok ? 'connected' : 'error',
        last_tested_at: new Date().toISOString(),
      }).eq('id', vendor.id)

      return NextResponse.json({ success: res.ok, status: res.status, response: text.substring(0, 500) })
    } catch (e: unknown) {
      await sb.from('vendor_apis').update({
        status: 'error',
        last_tested_at: new Date().toISOString(),
      }).eq('id', vendor.id)
      return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Request failed' })
    }
  }

  if (action === 'retry') {
    if (typeof body.orderId !== 'string') {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }
    // fulfillOrder refuses orders that are not paid, or already delivered.
    const result = await fulfillOrder(body.orderId)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
