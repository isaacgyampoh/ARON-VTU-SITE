'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Network } from '@/lib/types'

const PRESET_CODES = [
  { code: 'mtn', name: 'MTN', type: 'data' },
  { code: 'mtninstant', name: 'MTN Instant', type: 'data' },
  { code: 'mtnafa', name: 'MTN AFA Bundle', type: 'data' },
  { code: 'telecel', name: 'Telecel Non-Expiry', type: 'data' },
  { code: 'at', name: 'AirtelTigo iShare', type: 'data' },
  { code: 'airteltigo', name: 'AirtelTigo BigTime', type: 'data' },
  { code: 'netflix', name: 'Netflix', type: 'streaming' },
  { code: 'applemusic', name: 'Apple Music', type: 'streaming' },
  { code: 'appletv', name: 'Apple TV', type: 'streaming' },
  { code: 'applegames', name: 'Apple Arcade/Games', type: 'streaming' },
  { code: 'icloud', name: 'iCloud Storage', type: 'streaming' },
  { code: 'amazon', name: 'Amazon Prime', type: 'streaming' },
]

export default function NetworksPage() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [editing, setEditing] = useState<Partial<Network> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('networks').select('*').order('type').order('name')
    setNetworks(data || [])
    setLoading(false)
  }

  async function save() {
    if (!editing) return
    const { id, ...data } = editing as any
    if (id) {
      await supabase.from('networks').update(data).eq('id', id)
    } else {
      await supabase.from('networks').insert(data)
    }
    setEditing(null)
    load()
  }

  async function toggle(id: string, active: boolean) {
    await supabase.from('networks').update({ is_active: !active }).eq('id', id)
    load()
  }

  async function del(id: string) {
    if (!confirm('Delete this network? This will also hide all its bundles.')) return
    await supabase.from('networks').delete().eq('id', id)
    load()
  }

  function newFromPreset(p: typeof PRESET_CODES[0]) {
    setEditing({ name: p.name, code: p.code, type: p.type as 'data' | 'streaming', is_active: true, logo_url: null })
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" /></div>

  const dataNets = networks.filter(n => n.type === 'data')
  const streamNets = networks.filter(n => n.type === 'streaming')
  const existingCodes = networks.map(n => n.code)
  const missingPresets = PRESET_CODES.filter(p => !existingCodes.includes(p.code))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-900">Networks</h1>
        <button
          onClick={() => setEditing({ name: '', code: '', type: 'data', is_active: true, logo_url: null })}
          className="h-9 px-4 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
        >+ Add Network</button>
      </div>

      {/* Quick-add missing presets */}
      {missingPresets.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-2">Quick-add missing networks:</p>
          <div className="flex flex-wrap gap-2">
            {missingPresets.map(p => (
              <button key={p.code} onClick={() => newFromPreset(p)}
                className="h-7 px-3 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-medium hover:bg-amber-100 transition">
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md">
            <h2 className="font-bold text-slate-900 mb-4">{(editing as any).id ? 'Edit' : 'New'} Network</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Display name (e.g. MTN)" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                <input value={editing.code || ''} onChange={e => setEditing({ ...editing, code: e.target.value.toLowerCase() })}
                  placeholder="Code (e.g. mtn)" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-mono" />
              </div>
              <select value={editing.type || 'data'} onChange={e => setEditing({ ...editing, type: e.target.value as 'data' | 'streaming' })}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm">
                <option value="data">Data</option>
                <option value="streaming">Streaming</option>
              </select>
              <input value={editing.logo_url || ''} onChange={e => setEditing({ ...editing, logo_url: e.target.value || null })}
                placeholder="Logo URL (optional)" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={save} className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-sm font-semibold">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 h-10 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Data Networks */}
      {dataNets.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data Networks</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {dataNets.map(n => (
              <div key={n.id} className={`flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 ${!n.is_active ? 'opacity-40' : ''}`}>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{n.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{n.code}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggle(n.id, n.is_active)}
                    className={`text-[10px] px-2 py-1 rounded font-semibold ${n.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {n.is_active ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={() => setEditing(n)} className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 rounded font-semibold">Edit</button>
                  <button onClick={() => del(n.id)} className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded font-semibold">Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streaming Networks */}
      {streamNets.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Streaming Networks</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {streamNets.map(n => (
              <div key={n.id} className={`flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 ${!n.is_active ? 'opacity-40' : ''}`}>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{n.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{n.code}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggle(n.id, n.is_active)}
                    className={`text-[10px] px-2 py-1 rounded font-semibold ${n.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {n.is_active ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={() => setEditing(n)} className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 rounded font-semibold">Edit</button>
                  <button onClick={() => del(n.id)} className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded font-semibold">Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {networks.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-slate-400 mb-4">No networks yet. Add one above or use a quick-add preset.</p>
        </div>
      )}
    </div>
  )
}
