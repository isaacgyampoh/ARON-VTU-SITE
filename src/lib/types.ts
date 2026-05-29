export type Network = {
  id: string
  name: string
  code: string
  logo_url: string | null
  is_active: boolean
}

export type DataPlan = {
  id: string
  network_id: string
  name: string
  data_amount: string
  validity: string
  selling_price: number
  cost_price: number
  vendor_plan_id: string | null
  is_active: boolean
  sort_order: number
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
  payment_status: string
  vendor_status: string
  vendor_response: any
  vendor_api_used: string | null
  retry_count: number
  created_at: string
  paid_at: string | null
  fulfilled_at: string | null
}

export type Customer = {
  id: string
  phone: string
  network: string | null
  total_purchases: number
  total_spent: number
  last_purchase_at: string | null
  first_seen_at: string
}
