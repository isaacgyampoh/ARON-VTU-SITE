import { createServiceClient } from './supabase'

const STREAMING = ['netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon']
const MANUAL_PRODUCTS = ['mtnafa'] // AFA requires registration with Ghana Card — manual fulfillment
// Vendor details live in settings so they can be changed from the admin
// without a code change or redeploy. The environment variables are a fallback
// for a fresh install; the values saved in the admin always win.
const FALLBACK_KEY = process.env.VENDOR_API_KEY || ''
const FALLBACK_URL = process.env.VENDOR_BASE_URL || 'https://www.xpresportal.app/api/v1'

let cached: { key: string; url: string; auto: boolean; at: number } | null = null

async function vendorSettings() {
  // Cached briefly so a busy checkout does not re-read settings every call.
  if (cached && Date.now() - cached.at < 30_000) return cached
  try {
    const sb = createServiceClient()
    const { data } = await sb.from('app_settings').select('key, value')
    const map: Record<string, string> = {}
    for (const r of data || []) map[r.key] = r.value ?? ''
    cached = {
      key: map.vendor_api_key || FALLBACK_KEY,
      url: (map.vendor_base_url || FALLBACK_URL).replace(/\/$/, ''),
      auto: (map.auto_fulfil ?? 'on') !== 'off',
      at: Date.now(),
    }
  } catch {
    cached = { key: FALLBACK_KEY, url: FALLBACK_URL, auto: true, at: Date.now() }
  }
  return cached
}

/** Clear the cache after settings are saved, so changes take effect at once. */
export function clearVendorCache() { cached = null }

// Network slug in URL path
const NETWORK_SLUG: Record<string, string> = {
  mtn:        'mtn',
  mtninstant: 'mtn',
  mtnafa:     'mtn',
  telecel:    'telecel',
  at:         'airteltigo',
  airteltigo: 'airteltigo',
}

// offerSlug per network — from GET /offers (confirmed live)
const OFFER_SLUG: Record<string, string> = {
  mtn:        'mtn_master_beneficiary_portal',
  mtninstant: 'mtn_express_data',
  mtnafa:     'mtn_express_data',
  telecel:    'telecel_group_share_portal',
  at:         'airteltigo_ishare_portal',
  airteltigo: 'airteltigo_bigtime_portal',
}

function apiHeaders(key: string) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-key': key,
    'Origin': 'https://chaledata.com',
    'Referer': 'https://chaledata.com/',
  }
}

// ── GET /balance ────────────────────────────────────────────────────
export async function checkXpresBalance() {
  try {
    const s = await vendorSettings()
    const res = await fetch(`${s.url}/balance`, {
      headers: apiHeaders(s.key),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    const data = await res.json()
    const balance = data.balance ?? data.wallet_balance ?? data.data?.balance ?? 0
    return { success: res.ok, balance: Number(balance), raw: data }
  } catch (e: any) {
    return { success: false, balance: 0, raw: { error: e.message } }
  }
}

// ── GET /offers ─────────────────────────────────────────────────────
export async function fetchXpresOffers() {
  const s = await vendorSettings()
  const res = await fetch(`${s.url}/offers`, {
    headers: apiHeaders(s.key),
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  return res.json()
}

// ── POST /order/:network ─────────────────────────────────────────────
async function xpresPurchase(order: {
  phone: string        // stored as 233XXXXXXXXX in DB
  network: string
  data_amount: string  // e.g. "5GB"
  vendor_plan_id?: string
  order_no: string
}) {
  const networkSlug = NETWORK_SLUG[order.network] || order.network.toLowerCase()
  const offerSlug   = OFFER_SLUG[order.network]   || 'mtn_data_bundle'

  // phone already stored as 233XXXXXXXXX — xpresportal wants this format
  const phone = order.phone.startsWith('233')
    ? order.phone
    : order.phone.replace(/^0/, '233')

  // volume = numeric GB e.g. "5GB" → 2, "10GB" → 10
  const rawVol = order.vendor_plan_id || order.data_amount
  const volume = parseInt(rawVol.replace(/[^0-9]/g, ''), 10)

  // Validate volume is in allowed range for this offer
  // MTN Master: [1-100], MTN Express: [1-100], Telecel: [5-100], AT iShare: [1-50], AT BigTime: [20-500]
  const TELECEL_MIN = 5
  const finalVolume = (offerSlug === 'telecel_group_share_portal' && volume < TELECEL_MIN)
    ? TELECEL_MIN
    : volume

  const body = {
    type:       'single',
    volume:     String(finalVolume),
    phone,
    offerSlug,
    metadata: {
      idempotencyKey: order.order_no,
    },
  }

  console.log(`[xpres] POST /order/${networkSlug}`, JSON.stringify(body))

  const s = await vendorSettings()
  const res = await fetch(`${s.url}/order/${networkSlug}`, {
    method: 'POST',
    headers: apiHeaders(s.key),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })

  const data = await res.json()
  console.log('[xpres] response status:', res.status, JSON.stringify(data))

  // 201 Created = success per docs
  const success = (res.status === 201 || res.ok) && data.success === true

  return {
    success,
    httpStatus: res.status,
    vendor_name: 'xpresportal',
    orderId: data.orderId,
    xpresReference: data.reference,
    xpresStatus: data.status,
    response: data,
    error: success ? null : (data.message || data.error || `HTTP ${res.status}`),
  }
}

// ── Fulfill one order ───────────────────────────────────────────────
export async function fulfillOrder(orderId: string, maxRetries = 2) {
  const sb = createServiceClient()
  const { data: order } = await sb
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!order) return { success: false, error: 'Order not found' }

  // Automatic buying switched off → record the order for someone to fulfil by
  // hand. The customer has still paid; nothing is lost, it simply waits in the
  // admin with the number and bundle to buy.
  const settings = await vendorSettings()
  if (!settings.auto) {
    await sb.from('orders').update({
      vendor_status:   'manual_required',
      vendor_api_used: 'manual',
      vendor_response: { note: 'Automatic buying is switched off. Buy this bundle manually, then mark the order complete.' },
    }).eq('id', orderId)
    return { success: true, manual: true }
  }

  // No vendor key configured → same as above, rather than failing the order.
  if (!settings.key) {
    await sb.from('orders').update({
      vendor_status:   'manual_required',
      vendor_api_used: 'manual',
      vendor_response: { note: 'No vendor API key is set. Buy this bundle manually, then mark the order complete.' },
    }).eq('id', orderId)
    return { success: true, manual: true }
  }

  // Streaming + AFA → manual fulfillment, no vendor API call
  if (STREAMING.includes(order.network) || MANUAL_PRODUCTS.includes(order.network)) {
    const note = MANUAL_PRODUCTS.includes(order.network)
      ? 'MTN AFA Registration — requires customer Ghana Card ID. Contact customer on WhatsApp to collect details.'
      : 'Streaming subscription — fulfil manually via WhatsApp'
    await sb.from('orders').update({
      vendor_status:   'manual_required',
      vendor_api_used: 'manual',
      vendor_response: { note },
    }).eq('id', orderId)
    return { success: true, manual: true }
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await xpresPurchase({
      phone:         order.phone,
      network:       order.network,
      data_amount:   order.data_amount,
      vendor_plan_id: order.vendor_plan_id,
      order_no:      order.order_no,
    })

    const isFinal = attempt === maxRetries

    await sb.from('orders').update({
      vendor_status:   result.success ? 'success' : (isFinal ? 'failed' : 'pending'),
      vendor_response: result.response,
      vendor_api_used: 'xpresportal',
      retry_count:     attempt,
      fulfilled_at:    result.success ? new Date().toISOString() : null,
    }).eq('id', orderId)

    if (result.success) return result

    console.error(`[xpres] attempt ${attempt} failed:`, result.error)
    if (!isFinal) await new Promise(r => setTimeout(r, 1500))
  }

  return { success: false, error: 'All retries exhausted' }
}
