export type NetworkType = 'data' | 'streaming'

export type Network = {
  id: string
  name: string
  code: string
  logo_url: string | null
  is_active: boolean
  type: NetworkType
}

/** What the shop is allowed to know about a plan — no cost price. */
export type PublicPlan = {
  id: string
  network_id: string
  name: string
  data_amount: string
  validity: string
  selling_price: number
  is_active: boolean
  sort_order: number
}

export type DataPlan = PublicPlan & {
  cost_price: number
  vendor_plan_id: string | null
  category: NetworkType
  networks?: { name: string; code: string; type: string }
}

export type VendorApi = {
  id: string
  name: string
  base_url: string
  api_key: string | null
  purchase_endpoint: string
  headers: Record<string, string>
  request_format: Record<string, string>
  is_active: boolean
  status: string
  last_tested_at: string | null
  notes: string | null
}

export type PaymentStatus = 'pending' | 'paid' | 'failed'
export type VendorStatus = 'pending' | 'success' | 'failed' | 'manual_required'

export type Order = {
  id: string
  order_no: string
  phone: string
  network: string
  plan_name: string
  data_amount: string
  amount: number
  cost_price: number
  profit: number
  paystack_ref: string | null
  payment_status: PaymentStatus
  vendor_status: VendorStatus
  vendor_response: unknown
  vendor_api_used: string | null
  retry_count: number
  created_at: string
  paid_at: string | null
  fulfilled_at: string | null
  vendor_plan_id: string | null
}

/** What a customer is shown when tracking an order — no cost or profit. */
export type TrackedOrder = Pick<
  Order,
  'id' | 'order_no' | 'network' | 'plan_name' | 'data_amount' | 'amount'
  | 'payment_status' | 'vendor_status' | 'created_at'
>

export type Customer = {
  id: string
  phone: string
  network: string | null
  total_purchases: number
  total_spent: number
  last_purchase_at: string | null
  first_seen_at: string
}

export type VendorSettings = {
  key: string
  url: string
  auto: boolean
}

export type PurchaseResult = {
  success: boolean
  httpStatus: number
  vendor_name: string
  orderId?: string
  xpresReference?: string
  xpresStatus?: string
  response: unknown
  error: string | null
  /** The vendor can never accept this order as configured — retrying will not help. */
  unfulfillable?: boolean
}

export type FulfilResult = {
  success: boolean
  error?: string
  manual?: boolean
  note?: string
  alreadyFulfilled?: boolean
}
