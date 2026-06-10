import { createServiceClient } from './supabase'

const STREAMING = ['netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon']
const API_KEY = 'dk_llwYpusSIJLT7CpDBqQeUiLVQRymxTPO'
const BASE_URL = 'https://www.xpresportal.app/api/v1'

// xpresportal network slugs (used in URL path)
const NETWORK_SLUG: Record<string, string> = {
  mtn:        'MTN',
  mtninstant: 'MTN',
  mtnafa:     'MTN',
  telecel:    'Telecel',
  at:         'AirtelTigo',
  airteltigo: 'AirtelTigo',
}

// offerSlug per network (from GET /offers response)
const OFFER_SLUG: Record<string, string> = {
  mtn:        'mtn_data_bundle',
  mtninstant: 'mtn_data_bundle',
  mtnafa:     'mtn_data_bundle',
  telecel:    'telecel_data_bundle',
  at:         'airteltigo_data_bundle',
  airteltigo: 'airteltigo_data_bundle',
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-key': API_KEY,
  }
}

// ── GET /offers ─────────────────────────────────────────────────────
export async function fetchXpresOffers() {
  const res = await fetch(`${BASE_URL}/offers`, {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  return res.json()
}

// ── GET /balance ─────────────────────────────────────────────────────
export async function checkXpresBalance() {
  try {
    const res = await fetch(`${BASE_URL}/balance`, {
      headers: headers(),
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

// ── POST /order/{network} — Place an order ──────────────────────────
async function xpresPurchase(order: {
  phone: string
  network: string
  data_amount: string
  vendor_plan_id?: string
  amount: number
  order_no: string
}) {
  const networkSlug = NETWORK_SLUG[order.network] || order.network
  const offerSlug = OFFER_SLUG[order.network] || 'mtn_data_bundle'

  // Strip 233 prefix → local 0XX format
  const localPhone = order.phone.replace(/^233/, '0')

  // Volume = numeric GB value e.g. "5GB" → 5
  const volumeStr = order.vendor_plan_id || order.data_amount
  const volume = parseInt(volumeStr.replace(/[^0-9]/g, ''), 10)

  const body = {
    offer_slug: offerSlug,
    phone: localPhone,
    volume,
    reference: order.order_no,
  }

  console.log(`[xpres] POST /order/${networkSlug}`, JSON.stringify(body))

  const res = await fetch(`${BASE_URL}/order/${networkSlug}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })

  const data = await res.json()
  console.log('[xpres] response:', JSON.stringify(data))

  const success = res.ok && (data.success === true || data.status === true || data.status === 'success')

  return {
    success,
    status: res.status,
    vendor_name: 'xpresportal',
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

  // Streaming → mark manual, skip vendor
  if (STREAMING.includes(order.network)) {
    await sb.from('orders').update({
      vendor_status: 'manual_required',
      vendor_api_used: 'manual',
      vendor_response: { note: 'Streaming subscription — fulfil manually' },
    }).eq('id', orderId)
    return { success: true, manual: true }
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await xpresPurchase({
      phone: order.phone,
      network: order.network,
      data_amount: order.data_amount,
      vendor_plan_id: order.vendor_plan_id,
      amount: order.amount,
      order_no: order.order_no,
    })

    const isFinal = attempt === maxRetries
    await sb.from('orders').update({
      vendor_status: result.success ? 'success' : (isFinal ? 'failed' : 'pending'),
      vendor_response: result.response,
      vendor_api_used: 'xpresportal',
      retry_count: attempt,
      fulfilled_at: result.success ? new Date().toISOString() : null,
    }).eq('id', orderId)

    if (result.success) return result

    console.error(`[xpres] attempt ${attempt} failed:`, result.error)
    if (!isFinal) await new Promise(r => setTimeout(r, 1500))
  }

  return { success: false, error: 'All retries exhausted' }
}
