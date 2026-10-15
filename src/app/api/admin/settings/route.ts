import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { clearVendorCache, checkXpresBalance } from '@/lib/vendor'
import { requireAdmin } from '@/lib/require-admin'
import { assertSafeExternalUrl } from '@/lib/safe-url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET — current vendor settings. The key is never returned in full. */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

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
    keyPreview: key ? `${key.slice(0, 4)}…${key.slice(-4)}` : null,
  })
}

/** POST — save settings. Sending a blank key leaves the existing one alone. */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const sb = createServiceClient()

  const updates: { key: string; value: string }[] = []
  if (typeof body.autoFulfil === 'boolean') updates.push({ key: 'auto_fulfil', value: body.autoFulfil ? 'on' : 'off' })
  if (typeof body.vendorName === 'string') updates.push({ key: 'vendor_name', value: body.vendorName.trim() })

  if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) {
    // The API key is sent to this address on every purchase. Anything that is
    // not a public https endpoint would hand the key to the wrong place.
    try {
      assertSafeExternalUrl(body.baseUrl.trim())
    } catch (e: unknown) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid address' }, { status: 400 })
    }
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
  const denied = await requireAdmin()
  if (denied) return denied

  clearVendorCache()
  const r = await checkXpresBalance()
  return NextResponse.json({
    success: r.success,
    balance: r.balance,
    detail: r.success
      ? `Connected. Wallet balance: GH¢${Number(r.balance).toFixed(2)}`
      : 'Could not reach the vendor with these details.',
  })
}
