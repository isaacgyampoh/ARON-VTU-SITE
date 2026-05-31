'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/lib/types'

const GHS = (n: number) => `GH₵${Number(n).toFixed(2)}`

function StatusPill({ label, status }: { label: string; status: string }) {
  const ok = status === 'paid' || status === 'success'
  const pending = status === 'pending'
  const cls = ok
    ? 'bg-green-50 text-green-700 border-green-100'
    : pending
    ? 'bg-amber-50 text-amber-700 border-amber-100'
    : 'bg-red-50 text-red-700 border-red-100'
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : pending ? 'bg-amber-400' : 'bg-red-400'}`} />
      {label}: {status}
    </span>
  )
}

export default function OrderPage() {
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  async function search() {
    if (!phone.trim()) return
    setLoading(true)
    const clean = phone.trim().replace(/\s+/g, '').replace(/^0/, '233')
    const { data } = await supabase
      .from('orders').select('*').eq('phone', clean)
      .order('created_at', { ascending: false }).limit(10)
    setOrders(data || [])
    setSearched(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-black transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Home
          </a>
          <div className="flex items-center">
            <span className="text-[15px] font-black text-black">Chale</span>
            <span className="text-[15px] font-black text-blue-600">Data</span>
          </div>
          <div className="w-10" />
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 pt-8 pb-20">

        <h1 className="text-[22px] font-black text-black mb-1">Track Order</h1>
        <p className="text-[13px] text-gray-400 mb-7">Enter the phone number you used at checkout.</p>

        {/* Search */}
        <div className="flex gap-2 mb-8">
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="024 000 0000"
            className="flex-1 h-12 px-4 text-[15px] font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
          />
          <button
            onClick={search}
            disabled={loading || !phone.trim()}
            className="press h-12 px-5 bg-black text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-opacity"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
            ) : 'Search'}
          </button>
        </div>

        {/* Empty */}
        {searched && orders.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[13px] text-gray-300">No orders found for this number.</p>
            <p className="text-[12px] text-gray-300 mt-1">
              Need help?{' '}
              <a href="https://wa.me/233533547740" target="_blank" className="text-black underline underline-offset-2 font-medium">
                WhatsApp us
              </a>
            </p>
          </div>
        )}

        {/* Orders */}
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="border border-gray-200 rounded-2xl p-4 fade-up">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[10px] text-gray-300 font-mono tracking-wide mb-0.5">{o.order_no}</div>
                  <div className="text-[15px] font-bold text-black">{o.data_amount}</div>
                  <div className="text-[12px] text-gray-400">{o.network.toUpperCase()} · {o.plan_name}</div>
                </div>
                <div className="text-[15px] font-bold text-black">{GHS(o.amount)}</div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <StatusPill label="Payment" status={o.payment_status} />
                <StatusPill label="Data" status={o.vendor_status} />
              </div>
              <div className="text-[11px] text-gray-300">
                {new Date(o.created_at).toLocaleDateString('en-GH', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
