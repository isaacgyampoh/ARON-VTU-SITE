import { createServiceClient } from './supabase'

const STREAMING = ['netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon']
const API_KEY = 'dk_lUWtHYYDzJAlq-chnnvbdnmSwnSeSVx8'
const BASE_URL = 'https://www.xpresportal.app/api/v1'

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

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-key': API_KEY,
    'Origin': 'https://chaledata.com',
    'Referer': 'https://chaledata.com/',
  }
}

// ── GET /balance ────────────────────────────────────────────────────
export async function checkXpresBalance() {
  try {
    const res = await fetch(`${BASE_URL}/balance`, {
      headers: apiHeaders(),
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
  const res = await fetch(`${BASE_URL}/offers`, {
    headers: apiHeaders(),
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

  const res = await fetch(`${BASE_URL}/order/${networkSlug}`, {
    method: 'POST',
    headers: apiHeaders(),
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

  // Streaming → manual fulfillment, no vendor API call
  if (STREAMING.includes(order.network)) {
    await sb.from('orders').update({
      vendor_status:   'manual_required',
      vendor_api_used: 'manual',
      vendor_response: { note: 'Streaming subscription — fulfil manually via WhatsApp' },
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
