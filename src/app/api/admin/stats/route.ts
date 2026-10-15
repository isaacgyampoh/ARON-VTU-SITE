import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PaidRow = {
  amount: number
  profit: number
  vendor_status: string
  network: string
  created_at: string
}

/** Dashboard totals, computed on the server so the numbers never leave it raw. */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const sb = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const [totalOrders, todayOrders, paid, customers] = await Promise.all([
    sb.from('orders').select('id', { count: 'exact', head: true }),
    sb.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
    sb.from('orders').select('amount, profit, vendor_status, network, created_at').eq('payment_status', 'paid'),
    sb.from('customers').select('id', { count: 'exact', head: true }),
  ])

  const rows = (paid.data ?? []) as PaidRow[]
  const sum = (pick: (r: PaidRow) => number) => rows.reduce((a, r) => a + Number(pick(r) || 0), 0)

  const netMap: Record<string, number> = {}
  for (const r of rows) netMap[r.network] = (netMap[r.network] || 0) + 1

  return NextResponse.json({
    totalOrders: totalOrders.count ?? 0,
    todayOrders: todayOrders.count ?? 0,
    customers: customers.count ?? 0,
    revenue: sum(r => r.amount),
    profit: sum(r => r.profit),
    todayRevenue: rows.filter(r => r.created_at?.startsWith(today)).reduce((a, r) => a + Number(r.amount || 0), 0),
    fulfilled: rows.filter(r => r.vendor_status === 'success').length,
    failed: rows.filter(r => r.vendor_status === 'failed').length,
    netMap,
  })
}
