import { createServiceClient } from './supabase'

const STREAMING = ['netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon']

// ── Xpresportal network codes ──────────────────────────────────────
const XPRES_NETWORK_MAP: Record<string, string> = {
  mtn:        'MTN',
  mtninstant: 'MTN',
  mtnafa:     'MTN',
  telecel:    'TELECEL',
  at:         'AT',
  airteltigo: 'AT',
}

// ── Main Xpresportal data purchase ─────────────────────────────────
async function xpresPurchase(order: {
  phone: string
  network: string
  data_amount: string
  vendor_plan_id?: string
  amount: number
  order_no: string
}) {
  const apiKey = 'dk_llwYpusSIJLT7CpDBqQeUiLVQRymxTPO'
  const baseUrl = 'https://www.xpresportal.app/api/v1'
  const network = XPRES_NETWORK_MAP[order.network] || order.network.toUpperCase()

  // Strip leading 233 → local 0XX format for xpresportal
  const localPhone = order.phone.replace(/^233/, '0')

  const body = {
    network,
    phone: localPhone,
    data_plan: order.vendor_plan_id || order.data_amount,
    reference: order.order_no,
  }

  console.log('[xpres] purchasing:', JSON.stringify(body))

  const res = await fetch(`${baseUrl}/data/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })

  const data = await res.json()
  console.log('[xpres] response:', JSON.stringify(data))

  // xpresportal returns {status: true/false, message: '...', data: {...}}
  const success = res.ok && (data.status === true || data.success === true || data.status === 'success')

  return {
    success,
    status: res.status,
    vendor_name: 'xpresportal',
    response: data,
    error: success ? null : (data.message || data.error || `HTTP ${res.status}`),
  }
}

// ── Check wallet balance ────────────────────────────────────────────
export async function checkXpresBalance(): Promise<{ balance: number; success: boolean; raw: any }> {
  const apiKey = 'dk_llwYpusSIJLT7CpDBqQeUiLVQRymxTPO'
  try {
    const res = await fetch('https://www.xpresportal.app/api/v1/balance', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    const balance = data.balance ?? data.wallet_balance ?? data.data?.balance ?? 0
    return { success: res.ok, balance: Number(balance), raw: data }
  } catch (e: any) {
    return { success: false, balance: 0, raw: { error: e.message } }
  }
}

// ── Fetch available data plans from xpresportal ────────────────────
export async function fetchXpresPlans(network: string): Promise<any[]> {
  const apiKey = 'dk_llwYpusSIJLT7CpDBqQeUiLVQRymxTPO'
  const net = XPRES_NETWORK_MAP[network] || network.toUpperCase()
  try {
    const res = await fetch(`https://www.xpresportal.app/api/v1/data/plans?network=${net}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    return data.data || data.plans || data || []
  } catch {
    return []
  }
}

// ── Fulfill one order ──────────────────────────────────────────────
export async function fulfillOrder(orderId: string, maxRetries = 2) {
  const sb = createServiceClient()
  const { data: order } = await sb
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!order) return { success: false, error: 'Order not found' }

  // Streaming — manual fulfillment, flag it
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
