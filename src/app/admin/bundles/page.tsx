'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Network, DataPlan } from '@/lib/types'

export default function BundlesPage() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [editing, setEditing] = useState<Partial<DataPlan> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: nets }, { data: pls }] = await Promise.all([
      supabase.from('networks').select('*').order('name'),
      supabase.from('data_plans').select('*, networks(name)').order('network_id').order('sort_order').order('selling_price'),
    ])
    setNetworks(nets || [])
    setPlans(pls || [])
    setLoading(false)
  }

  async function save() {
    if (!editing) return
    const { id, ...data } = editing as any
    delete data.networks
    if (id) {
      await supabase.from('data_plans').update(data).eq('id', id)
    } else {
      await supabase.from('data_plans').insert(data)
    }
    setEditing(null)
    load()
  }

  async function del(id: string) {
    if (!confirm('Delete this plan?')) return
    await supabase.from('data_plans').delete().eq('id', id)
    load()
  }

  async function toggle(id: string, active: boolean) {
    await supabase.from('data_plans').update({ is_active: !active }).eq('id', id)
    load()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-900">Data Bundles</h1>
        <button onClick={() => setEditing({ network_id: networks[0]?.id, is_active: true, sort_order: 0, selling_price: 0, cost_price: 0, validity: '30 days' })} className="h-9 px-4 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">+ Add Bundle</button>
      </div>

      {/* Edit/Create modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-slate-900 mb-4">{editing.id ? 'Edit' : 'New'} Bundle</h2>
            <div className="space-y-3">
              <select value={editing.network_id || ''} onChange={e => setEditing({ ...editing, network_id: e.target.value })} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm">
                {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
              <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Plan name (e.g. 1GB Daily)" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
              <input value={editing.data_amount || ''} onChange={e => setEditing({ ...editing, data_amount: e.target.value })} placeholder="Data amount (e.g. 1GB)" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
              <input value={editing.validity || ''} onChange={e => setEditing({ ...editing, validity: e.target.value })} placeholder="Validity (e.g. 30 days)" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" value={editing.selling_price || ''} onChange={e => setEditing({ ...editing, selling_price: Number(e.target.value) })} placeholder="Selling price" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                <input type="number" step="0.01" value={editing.cost_price || ''} onChange={e => setEditing({ ...editing, cost_price: Number(e.target.value) })} placeholder="Cost price" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
              </div>
              <input value={editing.vendor_plan_id || ''} onChange={e => setEditing({ ...editing, vendor_plan_id: e.target.value })} placeholder="Vendor plan ID (optional)" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
              <input type="number" value={editing.sort_order || 0} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} placeholder="Sort order" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={save} className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-sm font-semibold">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 h-10 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Plans table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {plans.map(p => (
          <div key={p.id} className={`flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 ${!p.is_active ? 'opacity-40' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400 uppercase">{(p as any).networks?.name}</div>
              <div className="text-sm font-semibold text-slate-900">{p.data_amount} — {p.name}</div>
              <div className="text-xs text-slate-500">{p.validity} · Sell: GHS {Number(p.selling_price).toFixed(2)} · Cost: GHS {Number(p.cost_price).toFixed(2)}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggle(p.id, p.is_active)} className={`text-[10px] px-2 py-1 rounded font-semibold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.is_active ? 'ON' : 'OFF'}</button>
              <button onClick={() => setEditing(p)} className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 rounded font-semibold">Edit</button>
              <button onClick={() => del(p.id)} className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded font-semibold">Del</button>
            </div>
          </div>
        ))}
        {plans.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No bundles yet. Add one above.</p>}
      </div>
    </div>
  )
}
