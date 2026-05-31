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
    if (s === 'paid' || s === 'success') return 'bg-green-100 text-green-700'
    if (s === 'pending') return 'bg-yellow-100 text-yellow-700'
    if (s === 'failed') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="min-h-screen">
      <nav className="h-14 px-4 flex items-center justify-between max-w-lg mx-auto">
        <a href="/" className="text-sm text-gray-400 hover:text-black transition">← Home</a>
        <div><span className="text-sm font-extrabold text-black">Chale</span><span className="text-sm font-extrabold text-blue-600">Data</span></div>
      </nav>

      <div className="max-w-lg mx-auto px-4 pb-16">
        <h1 className="text-xl font-bold text-black mb-1">Track Order</h1>
        <p className="text-sm text-gray-400 mb-6">Enter your phone number to find your orders.</p>

        <div className="flex gap-2 mb-8">
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="024 000 0000"
            className="flex-1 h-12 px-4 bg-gray-50 rounded-lg text-sm font-medium border border-gray-200 focus:outline-none focus:border-black transition" />
          <button onClick={search} disabled={loading} className="h-12 px-6 bg-black text-white rounded-lg text-sm font-semibold press disabled:opacity-50">
            {loading ? '...' : 'Search'}
          </button>
        </div>

        {searched && orders.length === 0 && <p className="text-center text-gray-300 py-12 text-sm">No orders found.</p>}

        <div className="space-y-2">
          {orders.map(o => (
            <div key={o.id} className="border border-gray-200 rounded-lg p-4 fade-up">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-[11px] text-gray-300 font-mono">{o.order_no}</div>
                  <div className="text-sm font-semibold text-black">{o.data_amount} · {o.network.toUpperCase()}</div>
                </div>
                <div className="text-sm font-bold text-black">GH₵ {Number(o.amount).toFixed(2)}</div>
              </div>
              <div className="flex gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${badge(o.payment_status)}`}>Payment: {o.payment_status}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${badge(o.vendor_status)}`}>Data: {o.vendor_status}</span>
              </div>
              <div className="text-[10px] text-gray-300 mt-2">{new Date(o.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
