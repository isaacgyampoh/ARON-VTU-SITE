import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { fulfillOrder } from '@/lib/vendor'

// POST /api/vendor?action=test — test vendor connection
// POST /api/vendor?action=retry&orderId=xxx — retry failed order
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const sb = createServiceClient()

  if (action === 'test') {
    const { vendorId } = await req.json()
    const { data: vendor } = await sb.from('vendor_apis').select('*').eq('id', vendorId).single()
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(vendor.headers || {}),
      }
      if (vendor.api_key) headers['Authorization'] = `Bearer ${vendor.api_key}`

      const res = await fetch(`${vendor.base_url.replace(/\/$/, '')}${vendor.purchase_endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ test: true }),
      })
      const data = await res.text()
      const status = res.ok ? 'connected' : 'error'

      await sb.from('vendor_apis').update({
        status,
        last_tested_at: new Date().toISOString(),
      }).eq('id', vendorId)

      return NextResponse.json({ success: res.ok, status: res.status, response: data.substring(0, 500) })
    } catch (e: any) {
      await sb.from('vendor_apis').update({
        status: 'error',
        last_tested_at: new Date().toISOString(),
      }).eq('id', vendorId)
      return NextResponse.json({ success: false, error: e.message })
    }
  }

  if (action === 'retry') {
    const { orderId } = await req.json()
    const result = await fulfillOrder(orderId)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
