'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/lib/types'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('customers').select('*').order('total_spent', { ascending: false }).limit(500)
    setCustomers(data || [])
    setLoading(false)
  }

  const filtered = search
    ? customers.filter(c => c.phone.includes(search.replace(/\s/g, '')) || c.network?.toLowerCase().includes(search.toLowerCase()))
    : customers

  function exportCSV() {
    const csv = 'Phone,Network,Total Purchases,Total Spent,Last Purchase\n' +
      filtered.map(c => `${c.phone},${c.network || ''},${c.total_purchases},${Number(c.total_spent).toFixed(2)},${c.last_purchase_at || ''}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  function exportPhones() {
    const phones = filtered.map(c => c.phone).join('\n')
    navigator.clipboard?.writeText(phones)
    alert(`${filtered.length} phone numbers copied to clipboard!`)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Customers</h1>
          <p className="text-xs text-slate-400">{customers.length} total customers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPhones} className="h-9 px-3 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 transition">Copy Phones</button>
          <button onClick={exportCSV} className="h-9 px-3 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">Export CSV</button>
        </div>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search phone or network..."
        className="w-full h-10 px-4 mb-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-[10px] text-slate-400 uppercase">MTN</div>
          <div className="text-lg font-bold text-yellow-600">{customers.filter(c => c.network === 'mtn').length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-[10px] text-slate-400 uppercase">Telecel</div>
          <div className="text-lg font-bold text-red-600">{customers.filter(c => c.network === 'telecel').length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-[10px] text-slate-400 uppercase">AirtelTigo</div>
          <div className="text-lg font-bold text-blue-600">{customers.filter(c => c.network === 'at').length}</div>
        </div>
      </div>

      {/* Customer list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.map(c => (
          <div key={c.id} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0">
            <div>
              <div className="text-sm font-medium text-slate-900">{c.phone}</div>
              <div className="text-[10px] text-slate-400 uppercase">{c.network || 'Unknown'} · {c.total_purchases} orders</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900">GHS {Number(c.total_spent).toFixed(2)}</div>
              <div className="text-[10px] text-slate-400">{c.last_purchase_at ? new Date(c.last_purchase_at).toLocaleDateString() : 'Never'}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No customers found.</p>}
      </div>
    </div>
  )
}
