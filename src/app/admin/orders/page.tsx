'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/lib/types'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200)
    setOrders(data || [])
    setLoading(false)
  }

  async function fixAllStuck() {
    if (!confirm('Fix all stuck paid orders and missing customers?')) return
    setActing('all')
    const res = await fetch('/api/admin/fix-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'all', adminPassword: 'chaledata2026' }),
    })
    const data = await res.json()
    alert(data.message || `Fixed ${data.fixed} of ${data.total} stuck orders`)
    setActing(null)
    load()
  }

  async function retry(id: string) {
    setActing(id)
    const res = await fetch('/api/vendor?action=retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id }),
    })
    const data = await res.json()
    alert(data.success ? '✅ Fulfilled via vendor!' : `❌ Failed: ${data.error}`)
    setActing(null)
    load()
  }

  async function markFulfilled(id: string) {
    if (!confirm('Mark this order as manually fulfilled?')) return
    setActing(id)
    await supabase.from('orders').update({
      vendor_status: 'success',
      fulfilled_at: new Date().toISOString(),
      vendor_api_used: 'manual',
    }).eq('id', id)
    setActing(null)
    load()
  }

  async function markPaid(id: string) {
    if (!confirm('Mark this order as paid? Only do this if you confirmed payment manually.')) return
    setActing(id)
    await supabase.from('orders').update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', id)
    setActing(null)
    load()
  }

  function exportCSV() {
    const rows = filtered.map(o =>
      [o.order_no, o.phone, o.network, o.data_amount, o.plan_name, o.amount, o.payment_status, o.vendor_status, o.created_at].join(',')
    )
    const csv = 'Order,Phone,Network,Data,Plan,Amount,Payment,Vendor,Date\n' + rows.join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const badge = (status: string) => {
    if (status === 'paid' || status === 'success') return 'bg-green-100 text-green-700'
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700'
    if (status === 'failed') return 'bg-red-100 text-red-700'
    return 'bg-slate-100 text-slate-500'
  }

  const filterFn = (o: Order) => {
    if (filter === 'paid') return o.payment_status === 'paid'
    if (filter === 'pending') return o.payment_status === 'pending'
    if (filter === 'failed') return o.vendor_status === 'failed'
    return true
  }

  const filtered = orders.filter(o => {
    if (!filterFn(o)) return false
    if (!search) return true
    return o.phone.includes(search) || o.order_no.toLowerCase().includes(search.toLowerCase()) || o.network.includes(search.toLowerCase())
  })

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-900">Orders</h1>
        <div className="flex gap-2">
          <button onClick={fixAllStuck} disabled={acting === 'all'}
            className="h-9 px-4 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition disabled:opacity-50">
            {acting === 'all' ? 'Fixing...' : 'Fix Stuck Orders'}
          </button>
          <button onClick={exportCSV} className="h-9 px-4 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 transition">Export CSV</button>
        </div>
      </div>

      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {['all', 'paid', 'pending', 'failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`h-8 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition ${filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}{' '}
            ({f === 'all' ? orders.length : orders.filter(o => f === 'failed' ? o.vendor_status === 'failed' : o.payment_status === f).length})
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search phone, order no, network..." className="w-full h-10 px-4 mb-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />

      <div className="space-y-2">
        {filtered.map(o => (
          <div key={o.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-3 cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
              <div className="flex justify-between items-start mb-1">
                <div>
                  <span className="text-xs text-slate-400 font-mono">{o.order_no}</span>
                  <div className="font-semibold text-slate-900 text-sm">{o.phone} · {o.network.toUpperCase()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">GHS {Number(o.amount).toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400">P: GHS {Number(o.profit).toFixed(2)}</div>
                </div>
              </div>
              <div className="text-xs text-slate-500 mb-2">{o.data_amount} · {o.plan_name}</div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge(o.payment_status)}`}>{o.payment_status}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge(o.vendor_status)}`}>{o.vendor_status}</span>
                  {o.vendor_api_used && <span className="text-[10px] text-slate-400">{o.vendor_api_used}</span>}
                  {o.retry_count > 0 && <span className="text-[10px] text-slate-400">Retries: {o.retry_count}</span>}
                </div>
                <span className="text-[10px] text-slate-300">{new Date(o.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Expanded actions */}
            {expanded === o.id && (
              <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 flex flex-wrap gap-2">
                {o.vendor_status === 'failed' && o.payment_status === 'paid' && (
                  <button disabled={acting === o.id} onClick={() => retry(o.id)}
                    className="h-8 px-3 bg-blue-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                    {acting === o.id ? 'Retrying...' : 'Retry Vendor'}
                  </button>
                )}
                {o.payment_status === 'paid' && o.vendor_status !== 'success' && (
                  <button disabled={acting === o.id} onClick={() => markFulfilled(o.id)}
                    className="h-8 px-3 bg-green-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                    Mark Fulfilled
                  </button>
                )}
                {o.payment_status === 'pending' && (
                  <button disabled={acting === o.id} onClick={() => markPaid(o.id)}
                    className="h-8 px-3 bg-amber-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                    Mark Paid
                  </button>
                )}
                <a href={`https://wa.me/${o.phone.replace(/^0/, '233')}?text=Hi! Your ChaleData order ${o.order_no} for ${o.data_amount} (${o.network.toUpperCase()}) has been processed. Thank you!`}
                  target="_blank"
                  className="h-8 px-3 bg-[#25D366] text-white rounded-lg text-xs font-semibold flex items-center">
                  WhatsApp
                </a>
                {o.vendor_response && (
                  <details className="w-full">
                    <summary className="text-[10px] text-slate-400 cursor-pointer mt-1">Vendor response</summary>
                    <pre className="text-[9px] text-slate-500 mt-1 overflow-x-auto">{JSON.stringify(o.vendor_response, null, 2)}</pre>
                  </details>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No orders found.</p>}
      </div>
    </div>
  )
}
