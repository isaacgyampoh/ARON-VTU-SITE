import { createServiceClient } from './supabase'
import { env } from './env'
import type { Order, VendorSettings, PurchaseResult, FulfilResult } from './types'

const STREAMING = ['netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon']
const MANUAL_PRODUCTS = ['mtnafa'] // AFA requires registration with Ghana Card — manual fulfillment

// Vendor details live in settings so they can be changed from the admin
// without a code change or redeploy. The environment variables are a fallback
// for a fresh install; the values saved in the admin always win.

let cached: (VendorSettings & { at: number }) | null = null

async function vendorSettings(): Promise<VendorSettings> {
  // Cached briefly so a busy checkout does not re-read settings every call.
  if (cached && Date.now() - cached.at < 30_000) return cached
  try {
    const sb = createServiceClient()
    const { data } = await sb.from('app_settings').select('key, value')
    const map: Record<string, string> = {}
    for (const r of data || []) map[r.key] = r.value ?? ''
    cached = {
      key: map.vendor_api_key || env.vendorFallbackKey(),
      url: (map.vendor_base_url || env.vendorFallbackUrl()).replace(/\/$/, ''),
      auto: (map.auto_fulfil ?? 'on') !== 'off',
      at: Date.now(),
    }
  } catch {
    cached = { key: env.vendorFallbackKey(), url: env.vendorFallbackUrl(), auto: true, at: Date.now() }
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

/** Volume range each offer will accept, in GB. */
const OFFER_VOLUME_RANGE: Record<string, { min: number; max: number }> = {
  mtn_master_beneficiary_portal: { min: 1,  max: 100 },
  mtn_express_data:              { min: 1,  max: 100 },
  telecel_group_share_portal:    { min: 5,  max: 100 },
  airteltigo_ishare_portal:      { min: 1,  max: 50  },
  airteltigo_bigtime_portal:     { min: 20, max: 500 },
}

/**
 * Reads the bundle size in whole GB.
 *
 * This used to strip every non-digit and call parseInt, so "500MB" asked the
 * vendor for 500GB and "1.5GB" asked for 15GB — real money, at the wrong size.
 * Anything that does not resolve to a whole number of GB returns null, and the
 * caller leaves the order for a human rather than guessing.
 */
export function parseVolumeGb(raw: string | null | undefined): number | null {
  const text = String(raw ?? '').trim()
  if (!text) return null

  // A bare number in vendor_plan_id is taken as GB, as configured in the admin.
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(gb|mb|tb)?$/i)
  if (!match) return null

  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null

  const unit = (match[2] || 'gb').toLowerCase()
  const gb = unit === 'mb' ? value / 1024 : unit === 'tb' ? value * 1024 : value

  return Number.isInteger(gb) ? gb : null
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
    if (!s.key) return { success: false, balance: 0, raw: { error: 'No vendor API key is configured.' } }
    const res = await fetch(`${s.url}/balance`, {
      headers: apiHeaders(s.key),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    const data = await res.json()
    const balance = data.balance ?? data.wallet_balance ?? data.data?.balance ?? 0
    return { success: res.ok, balance: Number(balance), raw: data }
  } catch (e: unknown) {
    return { success: false, balance: 0, raw: { error: e instanceof Error ? e.message : 'Request failed' } }
  }
}

// ── GET /offers ─────────────────────────────────────────────────────
export async function fetchXpresOffers() {
  const s = await vendorSettings()
  if (!s.key) throw new Error('No vendor API key is configured.')
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
  vendor_plan_id?: string | null
  order_no: string
}): Promise<PurchaseResult> {
  const networkSlug = NETWORK_SLUG[order.network] || order.network.toLowerCase()
  const offerSlug   = OFFER_SLUG[order.network]   || 'mtn_data_bundle'

  // phone already stored as 233XXXXXXXXX — xpresportal wants this format
  const phone = order.phone.startsWith('233')
    ? order.phone
    : order.phone.replace(/^0/, '233')

  const volume = parseVolumeGb(order.vendor_plan_id) ?? parseVolumeGb(order.data_amount)
  if (volume === null) {
    return {
      success: false, httpStatus: 0, vendor_name: 'xpresportal', response: null,
      error: `Cannot read a whole number of GB from "${order.vendor_plan_id || order.data_amount}". Set the vendor plan ID on this bundle.`,
      unfulfillable: true,
    }
  }

  // Buying outside the offer's range used to be papered over by clamping a
  // small Telecel order up to 5GB — which quietly bought more than the customer
  // paid for. Refuse instead, and let a human decide.
  const range = OFFER_VOLUME_RANGE[offerSlug]
  if (range && (volume < range.min || volume > range.max)) {
    return {
      success: false, httpStatus: 0, vendor_name: 'xpresportal', response: null,
      error: `${volume}GB is outside what ${offerSlug} accepts (${range.min}–${range.max}GB). Fulfil this order by hand.`,
      unfulfillable: true,
    }
  }

  const body = {
    type:       'single',
    volume:     String(volume),
    phone,
    offerSlug,
    metadata: {
      idempotencyKey: order.order_no,
    },
  }

  console.log(`[xpres] POST /order/${networkSlug} ${order.order_no} volume=${volume}`)

  const s = await vendorSettings()
  const res = await fetch(`${s.url}/order/${networkSlug}`, {
    method: 'POST',
    headers: apiHeaders(s.key),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })

  const data = await res.json().catch(() => ({}))
  console.log(`[xpres] ${order.order_no} status:`, res.status, data?.success)

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

/** Records an order as needing a person, with the reason shown in the admin. */
async function markManual(orderId: string, note: string): Promise<FulfilResult> {
  const sb = createServiceClient()
  await sb.from('orders').update({
    vendor_status:   'manual_required',
    vendor_api_used: 'manual',
    vendor_response: { note },
  }).eq('id', orderId)
  return { success: true, manual: true, note }
}

// ── Fulfill one order ───────────────────────────────────────────────
export async function fulfillOrder(orderId: string, maxRetries = 2): Promise<FulfilResult> {
  const sb = createServiceClient()
  const { data: order } = await sb
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single<Order>()

  if (!order) return { success: false, error: 'Order not found' }

  // Never buy anything for an order that has not been paid for. Without this,
  // an unpaid order id was enough to have data bought and delivered for free.
  if (order.payment_status !== 'paid') {
    return { success: false, error: 'Order is not paid' }
  }

  // Already delivered — do not buy it a second time.
  if (order.vendor_status === 'success') {
    return { success: true, alreadyFulfilled: true }
  }

  const settings = await vendorSettings()

  // Automatic buying switched off → record the order for someone to fulfil by
  // hand. The customer has still paid; nothing is lost, it simply waits in the
  // admin with the number and bundle to buy.
  if (!settings.auto) {
    return markManual(orderId, 'Automatic buying is switched off. Buy this bundle manually, then mark the order complete.')
  }

  // No vendor key configured → same as above, rather than failing the order.
  if (!settings.key) {
    return markManual(orderId, 'No vendor API key is set. Buy this bundle manually, then mark the order complete.')
  }

  // Streaming + AFA → manual fulfillment, no vendor API call
  if (STREAMING.includes(order.network) || MANUAL_PRODUCTS.includes(order.network)) {
    return markManual(orderId, MANUAL_PRODUCTS.includes(order.network)
      ? 'MTN AFA Registration — requires customer Ghana Card ID. Contact customer on WhatsApp to collect details.'
      : 'Streaming subscription — fulfil manually via WhatsApp')
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await xpresPurchase({
      phone:          order.phone,
      network:        order.network,
      data_amount:    order.data_amount,
      vendor_plan_id: order.vendor_plan_id,
      order_no:       order.order_no,
    })

    // A bundle the vendor can never accept will not improve on a retry, and the
    // customer has paid — hand it to a person straight away.
    if (result.unfulfillable) {
      return markManual(orderId, result.error || 'This bundle cannot be bought automatically.')
    }

    const isFinal = attempt === maxRetries

    await sb.from('orders').update({
      vendor_status:   result.success ? 'success' : (isFinal ? 'failed' : 'pending'),
      vendor_response: result.response,
      vendor_api_used: 'xpresportal',
      retry_count:     attempt,
      fulfilled_at:    result.success ? new Date().toISOString() : null,
    }).eq('id', orderId)

    if (result.success) return { success: true }

    console.error(`[xpres] ${order.order_no} attempt ${attempt} failed:`, result.error)
    if (!isFinal) await new Promise(r => setTimeout(r, 1500))
  }

  return { success: false, error: 'All retries exhausted' }
}
