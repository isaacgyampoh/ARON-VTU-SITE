import { createServiceClient } from './supabase'

export async function getActiveVendor() {
  const sb = createServiceClient()
  const { data } = await sb.from('vendor_apis').select('*').eq('is_active', true).limit(1)
  return data?.[0] || null
}

export async function callVendorApi(order: {
  phone: string
  network: string
  plan_name: string
  data_amount: string
  vendor_plan_id?: string
  amount: number
}) {
  const vendor = await getActiveVendor()
  if (!vendor) return { success: false, error: 'No active vendor API configured' }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(vendor.headers || {}),
  }
  if (vendor.api_key) headers['Authorization'] = `Bearer ${vendor.api_key}`

  // Build request body — use vendor's request_format as template or default
  const body = vendor.request_format && Object.keys(vendor.request_format).length > 0
    ? Object.fromEntries(
        Object.entries(vendor.request_format).map(([k, v]) => [
          k,
          String(v)
            .replace('{phone}', order.phone)
            .replace('{network}', order.network)
            .replace('{plan}', order.vendor_plan_id || order.plan_name)
            .replace('{amount}', String(order.amount))
            .replace('{data}', order.data_amount)
        ])
      )
    : {
        phone: order.phone,
        network: order.network,
        plan_id: order.vendor_plan_id || order.plan_name,
        amount: order.amount,
        data_amount: order.data_amount,
      }

  const url = `${vendor.base_url.replace(/\/$/, '')}${vendor.purchase_endpoint}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return {
      success: res.ok,
      status: res.status,
      vendor_name: vendor.name,
      response: data,
    }
  } catch (e: any) {
    return {
      success: false,
      vendor_name: vendor.name,
      error: e.message,
    }
  }
}

export async function fulfillOrder(orderId: string, maxRetries = 3) {
  const sb = createServiceClient()
  const { data: order } = await sb.from('orders').select('*').eq('id', orderId).single()
  if (!order) return { success: false, error: 'Order not found' }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await callVendorApi({
      phone: order.phone,
      network: order.network,
      plan_name: order.plan_name,
      data_amount: order.data_amount,
      amount: order.amount,
    })

    await sb.from('orders').update({
      vendor_status: result.success ? 'success' : 'failed',
      vendor_response: result,
      vendor_api_used: result.vendor_name || 'unknown',
      retry_count: attempt,
      fulfilled_at: result.success ? new Date().toISOString() : null,
    }).eq('id', orderId)

    if (result.success) return result

    // Wait before retry
    if (attempt < maxRetries) await new Promise(r => setTimeout(r, 2000 * attempt))
  }

  return { success: false, error: 'All retries exhausted' }
}
