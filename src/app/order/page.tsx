'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/lib/types'

export default function OrderPage() {
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  async function search() {
    if (!phone.trim()) return
    setLoading(true)
    const clean = phone.trim().replace(/\s+/g, '').replace(/^0/, '233')
    const { data } = await supabase.from('orders').select('*').eq('phone', clean).order('created_at', { ascending: false }).limit(10)
    setOrders(data || [])
    setSearched(true)
    setLoading(false)
  }

  const statusColor = (s: string) => {
    if (s === 'paid' || s === 'success') return 'bg-green-100 text-green-700'
    if (s === 'pending') return 'bg-yellow-100 text-yellow-700'
    if (s === 'failed') return 'bg-red-100 text-red-700'
    return 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <a href="/" className="text-sm text-blue-600 hover:underline mb-6 inline-block">← Buy Data</a>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Track Order</h1>
      <p className="text-sm text-slate-500 mb-6">Enter your phone number to find your orders.</p>

      <div className="flex gap-2 mb-6">
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="024 XXX XXXX"
          className="flex-1 h-12 px-4 rounded-xl border-2 border-slate-200 text-base font-medium focus:outline-none focus:border-blue-500 transition"
        />
        <button onClick={search} disabled={loading} className="h-12 px-6 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition disabled:opacity-50">
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {searched && orders.length === 0 && (
        <p className="text-center text-slate-400 py-10">No orders found for this number.</p>
      )}

      {orders.map(o => (
        <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-3 fade-in">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-xs text-slate-400">{o.order_no}</div>
              <div className="font-bold text-slate-900">{o.data_amount} · {o.network.toUpperCase()}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-900">GHS {Number(o.amount).toFixed(2)}</div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusColor(o.payment_status)}`}>Payment: {o.payment_status}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusColor(o.vendor_status)}`}>Data: {o.vendor_status}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">{new Date(o.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}
