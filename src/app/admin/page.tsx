'use client'

import { useState, useEffect } from 'react'
import { adminGet } from '@/lib/admin-api'

type Stats = {
  totalOrders: number
  todayOrders: number
  customers: number
  revenue: number
  profit: number
  todayRevenue: number
  fulfilled: number
  failed: number
  netMap: Record<string, number>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [balance, setBalance] = useState<{ loading: boolean; value: number | null; error?: string }>({ loading: false, value: null })

  // The totals are worked out on the server now, so the numbers behind them —
  // every order row, with its cost and profit — never reach the browser.
  useEffect(() => {
    let cancelled = false
    adminGet<Stats>('/api/admin/stats')
      .then(s => { if (!cancelled) setStats(s) })
      .catch(e => console.error('[admin] stats failed:', e))
    return () => { cancelled = true }
  }, [])

  async function checkBalance() {
    setBalance({ loading: true, value: null })
    try {
      const res = await fetch('/api/admin/xpres-balance')
      const data = await res.json()
      if (data.success) {
        setBalance({ loading: false, value: data.balance })
      } else {
        setBalance({ loading: false, value: null, error: data.error || 'Failed to fetch balance' })
      }
    } catch {
      setBalance({ loading: false, value: null, error: 'Could not reach the vendor' })
    }
  }

  if (!stats) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
        <button onClick={() => window.location.reload()} className="text-xs text-slate-400 hover:text-slate-600">Refresh</button>
      </div>

      {/* Xpresportal balance widget */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Xpresportal Wallet</div>
          {balance.loading && <div className="text-sm text-slate-400">Checking...</div>}
          {balance.value !== null && !balance.loading && (
            <div className={`text-xl font-bold ${balance.value < 10 ? 'text-red-600' : 'text-green-600'}`}>
              GHS {balance.value.toFixed(2)}
              {balance.value < 10 && <span className="text-xs ml-2 font-normal text-red-500">⚠ Low balance — top up now</span>}
            </div>
          )}
          {balance.error && <div className="text-xs text-red-500">{balance.error}</div>}
          {balance.value === null && !balance.loading && !balance.error && (
            <div className="text-sm text-slate-400">Click to check</div>
          )}
        </div>
        <button onClick={checkBalance} disabled={balance.loading}
          className="h-9 px-4 bg-slate-900 text-white rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-slate-700 transition">
          {balance.loading ? 'Checking...' : 'Check Balance'}
        </button>
      </div>

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
        {Object.entries(stats.netMap).sort((a, b) => b[1] - a[1]).map(([net, count]) => (
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
