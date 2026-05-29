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

  const badge = (s: string) => {
    if (s === 'paid' || s === 'success') return 'bg-emerald-100 text-emerald-700'
    if (s === 'pending') return 'bg-amber-100 text-amber-700'
    if (s === 'failed') return 'bg-red-100 text-red-700'
    return 'bg-slate-100 text-slate-500'
  }

  return (
    <div className="min-h-screen">
      <header className="px-4 h-16 flex items-center max-w-lg mx-auto">
        <a href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-700">← Buy Data</a>
      </header>

      <div className="max-w-lg mx-auto px-4 pb-20">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Track Order</h1>
        <p className="text-sm text-slate-400 mb-6">Enter your phone number to find your orders.</p>

        <div className="flex gap-2 mb-8">
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="024 000 0000"
            className="flex-1 h-12 px-4 bg-white rounded-2xl text-sm font-medium border-2 border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" />
          <button onClick={search} disabled={loading} className="h-12 px-6 bg-slate-900 text-white rounded-2xl text-sm font-semibold press hover:bg-slate-800 transition disabled:opacity-50">
            {loading ? '...' : 'Search'}
          </button>
        </div>

        {searched && orders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm text-slate-400">No orders found for this number.</p>
          </div>
        )}

        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-4 fade-up">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-[11px] text-slate-400 font-mono">{o.order_no}</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{o.data_amount} · <span className="uppercase">{o.network}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-slate-900">GH₵ {Number(o.amount).toFixed(2)}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badge(o.payment_status)}`}>Payment: {o.payment_status}</span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badge(o.vendor_status)}`}>Data: {o.vendor_status}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">{new Date(o.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
