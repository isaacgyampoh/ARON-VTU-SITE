// Server-only: every function here uses the service role key.
import { createServiceClient } from './supabase'
import type { Network, PublicPlan } from './types'

/**
 * Shop data, read on the server.
 *
 * The browser used to query Supabase directly with the anon key and select
 * `*` from data_plans — which handed every visitor the cost price of every
 * bundle, and so the margin on it. These reads happen server-side and name
 * their columns, so cost price never leaves the server.
 */

const PLAN_COLUMNS = 'id, network_id, name, data_amount, validity, selling_price, is_active, sort_order'

export async function getActiveNetworks(): Promise<Network[]> {
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('networks')
    .select('id, name, code, logo_url, is_active, type')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('[shop] networks read failed:', error)
    return []
  }
  return (data ?? []) as Network[]
}

export async function getActivePlans(): Promise<PublicPlan[]> {
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('data_plans')
    .select(PLAN_COLUMNS)
    .eq('is_active', true)
    .order('sort_order')
    .order('selling_price')

  if (error) {
    console.error('[shop] plans read failed:', error)
    return []
  }
  return (data ?? []) as PublicPlan[]
}

export async function getNetworkByCode(code: string): Promise<Network | null> {
  const sb = createServiceClient()
  const { data } = await sb
    .from('networks')
    .select('id, name, code, logo_url, is_active, type')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle()

  return (data as Network) ?? null
}

export async function getPlansForNetwork(networkId: string): Promise<PublicPlan[]> {
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('data_plans')
    .select(PLAN_COLUMNS)
    .eq('network_id', networkId)
    .eq('is_active', true)
    .order('sort_order')
    .order('selling_price')

  if (error) {
    console.error('[shop] network plans read failed:', error)
    return []
  }
  return (data ?? []) as PublicPlan[]
}
