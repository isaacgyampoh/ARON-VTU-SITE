import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { clearVendorCache, checkXpresBalance } from '@/lib/vendor'

export const runtime = 'nodejs'

/** GET — current vendor settings. The key is never returned in full. */
export async function GET() {
  const sb = createServiceClient()
  const { data } = await sb.from('app_settings').select('key, value')
  const map: Record<string, string> = {}
  for (const r of data || []) map[r.key] = r.value ?? ''

  const key = map.vendor_api_key || ''
  return NextResponse.json({
    autoFulfil: (map.auto_fulfil ?? 'on') !== 'off',
    vendorName: map.vendor_name || '',
    baseUrl: map.vendor_base_url || '',
    hasKey: !!key,
    keyPreview: key ? `${key.slice(0, 8)}…${key.slice(-4)}` : null,
  })
}

/** POST — save settings. Sending a blank key leaves the existing one alone. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const sb = createServiceClient()

  const updates: { key: string; value: string }[] = []
  if (typeof body.autoFulfil === 'boolean') updates.push({ key: 'auto_fulfil', value: body.autoFulfil ? 'on' : 'off' })
  if (typeof body.vendorName === 'string') updates.push({ key: 'vendor_name', value: body.vendorName.trim() })
  if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) {
    updates.push({ key: 'vendor_base_url', value: body.baseUrl.trim().replace(/\/$/, '') })
  }
  if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
    updates.push({ key: 'vendor_api_key', value: body.apiKey.trim() })
  }

  for (const u of updates) {
    await sb.from('app_settings')
      .upsert({ key: u.key, value: u.value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  }

  clearVendorCache()   // take effect immediately, no redeploy
  return NextResponse.json({ success: true, saved: updates.length })
}

/** PUT — check the saved vendor actually works, by reading the balance. */
export async function PUT() {
  clearVendorCache()
  const r = await checkXpresBalance()
  return NextResponse.json({
    success: r.success,
    balance: r.balance,
    detail: r.success ? `Connected. Wallet balance: GH¢${Number(r.balance).toFixed(2)}` : 'Could not reach the vendor with these details.',
    raw: r.raw,
  })
}
