'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/lib/types'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    let q = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100)
    const { data } = await q
    setOrders(data || [])
    setLoading(false)
  }

  async function retry(id: string) {
    const res = await fetch('/api/vendor?action=retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id }),
    })
    const data = await res.json()
    alert(data.success ? 'Fulfilled!' : `Failed: ${data.error}`)
    load()
  }

  const filtered = filter === 'all' ? orders : orders.filter(o =>
    filter === 'paid' ? o.payment_status === 'paid' :
    filter === 'pending' ? o.payment_status === 'pending' :
    filter === 'failed' ? o.vendor_status === 'failed' : true
  )

  const badge = (status: string) => {
    if (status === 'paid' || status === 'success') return 'bg-green-100 text-green-700'
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700'
    if (status === 'failed') return 'bg-red-100 text-red-700'
    return 'bg-slate-100 text-slate-500'
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" /></div>

  return (
    <div>
      <h1 className="text-lg font-bold text-slate-900 mb-4">Orders</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['all', 'paid', 'pending', 'failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`h-8 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition ${filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>{f.charAt(0).toUpperCase() + f.slice(1)} {f !== 'all' ? `(${orders.filter(o => f === 'failed' ? o.vendor_status === 'failed' : o.payment_status === f).length})` : `(${orders.length})`}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(o => (
          <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="flex justify-between items-start mb-1">
              <div>
                <span className="text-xs text-slate-400">{o.order_no}</span>
                <div className="font-semibold text-slate-900 text-sm">{o.phone} · {o.network.toUpperCase()}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm">GHS {Number(o.amount).toFixed(2)}</div>
                <div className="text-[10px] text-slate-400">Profit: GHS {Number(o.profit).toFixed(2)}</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 mb-2">{o.data_amount} · {o.plan_name}</div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge(o.payment_status)}`}>{o.payment_status}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge(o.vendor_status)}`}>{o.vendor_status}</span>
                {o.retry_count > 0 && <span className="text-[10px] text-slate-400">Retries: {o.retry_count}</span>}
              </div>
              {o.vendor_status === 'failed' && o.payment_status === 'paid' && (
                <button onClick={() => retry(o.id)} className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded font-semibold">Retry</button>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{new Date(o.created_at).toLocaleString()}</div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No orders found.</p>}
      </div>
    </div>
  )
}
