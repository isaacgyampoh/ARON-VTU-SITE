'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const today = new Date().toISOString().slice(0, 10)
    const [{ count: totalOrders }, { count: todayOrders }, { data: orders }, { count: customers }] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today + 'T00:00:00'),
      supabase.from('orders').select('amount,profit,payment_status,vendor_status,network,created_at').eq('payment_status', 'paid'),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
    ])

    const revenue = (orders || []).reduce((a, o) => a + Number(o.amount), 0)
    const profit = (orders || []).reduce((a, o) => a + Number(o.profit), 0)
    const fulfilled = (orders || []).filter(o => o.vendor_status === 'success').length
    const failed = (orders || []).filter(o => o.vendor_status === 'failed').length

    // Today's revenue
    const todayRevenue = (orders || []).filter(o => o.created_at?.startsWith(today)).reduce((a, o) => a + Number(o.amount), 0)

    // Top networks
    const netMap: Record<string, number> = {}
    ;(orders || []).forEach(o => { netMap[o.network] = (netMap[o.network] || 0) + 1 })

    setStats({ totalOrders, todayOrders, revenue, profit, todayRevenue, customers, fulfilled, failed, netMap })
  }

  if (!stats) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" /></div>

  const cards = [
    { label: 'Total Orders', value: stats.totalOrders || 0, color: 'bg-blue-50 text-blue-700' },
    { label: 'Today', value: stats.todayOrders || 0, color: 'bg-green-50 text-green-700' },
    { label: 'Revenue', value: `GHS ${stats.revenue.toFixed(2)}`, color: 'bg-purple-50 text-purple-700' },
    { label: 'Profit', value: `GHS ${stats.profit.toFixed(2)}`, color: 'bg-amber-50 text-amber-700' },
    { label: "Today's Revenue", value: `GHS ${stats.todayRevenue.toFixed(2)}`, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Customers', value: stats.customers || 0, color: 'bg-pink-50 text-pink-700' },
    { label: 'Fulfilled', value: stats.fulfilled, color: 'bg-green-50 text-green-700' },
    { label: 'Failed', value: stats.failed, color: 'bg-red-50 text-red-700' },
  ]

  return (
    <div>
      <h1 className="text-lg font-bold text-slate-900 mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className={`${c.color} rounded-xl p-4`}>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{c.label}</div>
            <div className="text-xl font-bold mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-bold text-slate-700 mb-2">Orders by Network</h2>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {Object.entries(stats.netMap).sort((a: any, b: any) => b[1] - a[1]).map(([net, count]: any) => (
          <div key={net} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <span className="text-sm font-medium uppercase text-slate-700">{net}</span>
            <span className="text-sm font-bold text-slate-900">{count} orders</span>
          </div>
        ))}
        {Object.keys(stats.netMap).length === 0 && <p className="text-sm text-slate-400 text-center py-4">No paid orders yet</p>}
      </div>
    </div>
  )
}
