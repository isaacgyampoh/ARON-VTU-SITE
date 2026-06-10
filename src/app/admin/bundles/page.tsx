'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Network, DataPlan } from '@/lib/types'

const STREAM_CODES = ['netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon']
const AFA_CODES = ['mtnafa']
const DURATION_PRESETS = ['1 Month', '2 Months', '3 Months', '6 Months', '1 Year']
const GB_SIZES = [
  '1GB','2GB','3GB','4GB','5GB','6GB','7GB','8GB','10GB',
  '15GB','20GB','25GB','30GB','40GB','50GB','75GB','100GB','150GB','200GB'
]

function isStreaming(networks: Network[], networkId: string) {
  const net = networks.find(n => n.id === networkId)
  return net ? (STREAM_CODES.includes(net.code) || net.type === 'streaming') : false
}

function isAfa(networks: Network[], networkId: string) {
  const net = networks.find(n => n.id === networkId)
  return net ? AFA_CODES.includes(net.code) : false
}

export default function BundlesPage() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [editing, setEditing] = useState<Partial<DataPlan> | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterNet, setFilterNet] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: nets }, { data: pls }] = await Promise.all([
      supabase.from('networks').select('*').order('type').order('name'),
      supabase.from('data_plans').select('*, networks(name, code, type)').order('network_id').order('sort_order').order('selling_price'),
    ])
    setNetworks(nets || [])
    setPlans(pls || [])
    setLoading(false)
  }

  async function save() {
    if (!editing) return
    const { id, ...data } = editing as any
    delete data.networks
    // For streaming, set validity = data_amount (e.g. "1 Month")
    const streaming = isStreaming(networks, data.network_id)
    const afa = isAfa(networks, data.network_id)
    if (streaming && data.data_amount) {
      data.validity = data.data_amount
    }
    if (afa) {
      data.data_amount = 'AFA Registration'
      data.validity = 'One-time'
    }
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

  function openNew() {
    setEditing({
      network_id: networks[0]?.id || '',
      is_active: true,
      sort_order: 0,
      selling_price: 0,
      cost_price: 0,
      name: '',
      data_amount: '',
      validity: '',
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  const streaming = editing ? isStreaming(networks, editing.network_id || '') : false

  // Group plans by network for display
  const filtered = filterNet === 'all' ? plans : plans.filter(p => p.network_id === filterNet)

  // Group by network
  const grouped: Record<string, { net: any; plans: DataPlan[] }> = {}
  filtered.forEach(p => {
    const key = p.network_id
    if (!grouped[key]) grouped[key] = { net: (p as any).networks, plans: [] }
    grouped[key].plans.push(p)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-900">Bundles & Subscriptions</h1>
        <button onClick={openNew}
          className="h-9 px-4 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">
          + Add Plan
        </button>
      </div>

      {/* Filter by network */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <button onClick={() => setFilterNet('all')}
          className={`h-7 px-3 rounded-lg text-xs font-semibold whitespace-nowrap ${filterNet === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
          All
        </button>
        {networks.map(n => (
          <button key={n.id} onClick={() => setFilterNet(n.id)}
            className={`h-7 px-3 rounded-lg text-xs font-semibold whitespace-nowrap ${filterNet === n.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
            {n.name}
          </button>
        ))}
      </div>

      {/* Add/Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-slate-900 mb-1">{(editing as any).id ? 'Edit' : 'New'} Plan</h2>
            <p className="text-xs text-slate-400 mb-4">
              {streaming ? 'Streaming subscription — set duration and price.' : isAfa(networks, editing?.network_id || '') ? 'AFA Registration — set registration fee.' : 'Data bundle — set size and price.'}
            </p>

            <div className="space-y-3">
              {/* Network selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Network</label>
                <select value={editing.network_id || ''} onChange={e => setEditing({ ...editing, network_id: e.target.value, data_amount: '', name: '' })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm">
                  {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>

              {streaming ? (
                /* ── Streaming fields ── */
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Duration</label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {DURATION_PRESETS.map(d => (
                        <button key={d} type="button"
                          onClick={() => setEditing({ ...editing, data_amount: d, name: d, validity: d })}
                          className={`h-9 rounded-lg text-xs font-semibold border transition ${
                            editing.data_amount === d
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                          }`}>
                          {d}
                        </button>
                      ))}
                    </div>
                    <input value={editing.data_amount || ''} onChange={e => setEditing({ ...editing, data_amount: e.target.value, name: e.target.value, validity: e.target.value })}
                      placeholder="Or type custom (e.g. 4 Months)"
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Notes (optional)</label>
                    <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })}
                      placeholder="e.g. Shared screen, 4K"
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </>
              ) : isAfa(networks, editing?.network_id || '') ? (
                /* ── AFA Registration fields ── */
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-800 mb-1">AFA Registration Product</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    This is a one-time registration fee. Customer pays, then you collect their Ghana Card details and register them on xpresportal manually.
                  </p>
                  <p className="text-[11px] text-amber-600 mt-2 font-semibold">
                    Just set the registration fee price below and save.
                  </p>
                </div>
              ) : (
                /* ── Data bundle fields ── */
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Data Size</label>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {GB_SIZES.map(gb => (
                      <button key={gb} type="button"
                        onClick={() => setEditing({ ...editing, data_amount: gb, name: gb, validity: 'Non-Expiry' })}
                        className={`h-9 rounded-lg text-xs font-bold border transition ${
                          editing.data_amount === gb
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                        }`}>
                        {gb}
                      </button>
                    ))}
                  </div>
                  {editing.data_amount && (
                    <p className="text-xs text-blue-600 font-semibold px-1">Selected: {editing.data_amount}</p>
                  )}
                </div>
              )}

              {/* Price — always shown */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Prices (GHS)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input type="number" step="0.01" min="0"
                      value={editing.selling_price || ''}
                      onChange={e => setEditing({ ...editing, selling_price: Number(e.target.value) })}
                      placeholder="Selling price"
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                    <p className="text-[10px] text-slate-400 mt-0.5 px-1">Customer pays</p>
                  </div>
                  <div>
                    <input type="number" step="0.01" min="0"
                      value={editing.cost_price || ''}
                      onChange={e => setEditing({ ...editing, cost_price: Number(e.target.value) })}
                      placeholder="Cost price"
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                    <p className="text-[10px] text-slate-400 mt-0.5 px-1">Your cost</p>
                  </div>
                </div>
                {editing.selling_price && editing.cost_price && Number(editing.selling_price) > Number(editing.cost_price) && (
                  <p className="text-xs text-green-600 font-semibold mt-2 px-1">
                    Profit: GHS {(Number(editing.selling_price) - Number(editing.cost_price)).toFixed(2)} per sale
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Vendor Plan ID (optional)</label>
                <input value={editing.vendor_plan_id || ''} onChange={e => setEditing({ ...editing, vendor_plan_id: e.target.value })}
                  placeholder="Used when calling vendor API"
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={save} className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                Save
              </button>
              <button onClick={() => setEditing(null)} className="flex-1 h-10 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans list — grouped by network */}
      {Object.keys(grouped).length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-400">No plans yet. Click &quot;+ Add Plan&quot; to get started.</p>
        </div>
      )}

      <div className="space-y-4">
        {Object.values(grouped).map(({ net, plans: netPlans }) => {
          const isStream = STREAM_CODES.includes(net?.code) || net?.type === 'streaming'
          return (
            <div key={netPlans[0].network_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className={`px-4 py-2.5 flex items-center justify-between border-b border-slate-100 ${isStream ? 'bg-purple-50' : 'bg-blue-50'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{net?.name}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isStream ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {isStream ? 'Streaming' : 'Data'}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{netPlans.length} plan{netPlans.length !== 1 ? 's' : ''}</span>
              </div>
              {netPlans.map(p => (
                <div key={p.id} className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 ${!p.is_active ? 'opacity-40' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {isStream ? p.data_amount : p.data_amount}
                      {p.name && p.name !== p.data_amount && (
                        <span className="text-slate-400 font-normal ml-1 text-xs">· {p.name}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      GHS {Number(p.selling_price).toFixed(2)}
                      <span className="text-slate-300 mx-1">·</span>
                      Cost: GHS {Number(p.cost_price).toFixed(2)}
                      <span className="text-green-600 ml-1 font-medium">
                        (+{(Number(p.selling_price) - Number(p.cost_price)).toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => toggle(p.id, p.is_active)}
                      className={`text-[10px] px-2 py-1 rounded font-semibold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {p.is_active ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={() => setEditing(p)} className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 rounded font-semibold">Edit</button>
                    <button onClick={() => del(p.id)} className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded font-semibold">Del</button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
