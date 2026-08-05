'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { VendorApi } from '@/lib/types'

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorApi[]>([])
  const [editing, setEditing] = useState<Partial<VendorApi> | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string>('')

  // Live vendor settings — which supplier is used, and whether buying is
  // automatic at all.
  const [cfg, setCfg] = useState<any>(null)
  const [form, setForm] = useState({ vendorName: '', baseUrl: '', apiKey: '' })
  const [savingCfg, setSavingCfg] = useState(false)
  const [cfgMsg, setCfgMsg] = useState('')

  async function loadCfg() {
    const d = await fetch('/api/admin/settings').then(r => r.json()).catch(() => null)
    if (d) { setCfg(d); setForm({ vendorName: d.vendorName || '', baseUrl: d.baseUrl || '', apiKey: '' }) }
  }

  async function saveCfg(patch: any) {
    setSavingCfg(true); setCfgMsg('')
    const d = await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(r => r.json()).catch(() => ({ error: 'failed' }))
    setSavingCfg(false)
    setCfgMsg(d.error ? 'Could not save' : 'Saved')
    setForm(f => ({ ...f, apiKey: '' }))
    loadCfg()
  }

  async function testCfg() {
    setSavingCfg(true); setCfgMsg('Checking…')
    const d = await fetch('/api/admin/settings', { method: 'PUT' }).then(r => r.json()).catch(() => ({ detail: 'Could not reach the vendor' }))
    setSavingCfg(false); setCfgMsg(d.detail || '')
  }

  useEffect(() => { load(); loadCfg() }, [])

  async function load() {
    const { data } = await supabase.from('vendor_apis').select('*').order('created_at')
    setVendors(data || [])
  }

  async function save() {
    if (!editing) return
    const { id, ...data } = editing as any
    if (typeof data.headers === 'string') try { data.headers = JSON.parse(data.headers) } catch { data.headers = {} }
    if (typeof data.request_format === 'string') try { data.request_format = JSON.parse(data.request_format) } catch { data.request_format = {} }
    if (id) await supabase.from('vendor_apis').update(data).eq('id', id)
    else await supabase.from('vendor_apis').insert(data)
    setEditing(null)
    load()
  }

  async function setActive(id: string) {
    // Deactivate all, then activate selected
    await supabase.from('vendor_apis').update({ is_active: false }).neq('id', 'none')
    await supabase.from('vendor_apis').update({ is_active: true }).eq('id', id)
    load()
  }

  async function testVendor(id: string) {
    setTesting(id)
    setTestResult('')
    try {
      const res = await fetch('/api/vendor?action=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: id }),
      })
      const data = await res.json()
      setTestResult(data.success ? `✅ Connected (${data.status})` : `❌ Failed: ${data.error || data.response}`)
    } catch (e: any) {
      setTestResult(`❌ Error: ${e.message}`)
    }
    setTesting(null)
    load()
  }

  async function del(id: string) {
    if (!confirm('Delete this vendor?')) return
    await supabase.from('vendor_apis').delete().eq('id', id)
    load()
  }

  return (
    <div>
      {/* ── Supply settings ── */}
      {cfg && (
        <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900 mb-1">Where data is bought from</h2>
          <p className="text-[12.5px] text-slate-500 mb-4">
            Turn automatic buying off and orders simply wait here with the number and bundle, for you to buy wherever you like.
          </p>

          {/* On / off */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-4">
            <div>
              <div className="text-[13.5px] font-semibold text-slate-900">
                Automatic buying is {cfg.autoFulfil ? 'ON' : 'OFF'}
              </div>
              <div className="text-[12px] text-slate-500 mt-0.5">
                {cfg.autoFulfil
                  ? 'Paid orders are sent to the vendor straight away.'
                  : 'Paid orders wait for you to buy them by hand.'}
              </div>
            </div>
            <button onClick={() => saveCfg({ autoFulfil: !cfg.autoFulfil })} disabled={savingCfg}
              className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${cfg.autoFulfil ? 'bg-green-500' : 'bg-slate-300'}`}
              aria-label="Toggle automatic buying">
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${cfg.autoFulfil ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* Vendor details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Vendor name</label>
              <input value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))}
                placeholder="e.g. Tera" className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">API address</label>
              <input value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://…/api/v1" className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                API key {cfg.hasKey && <span className="normal-case tracking-normal text-slate-400 font-normal">— currently {cfg.keyPreview}</span>}
              </label>
              <input value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                placeholder={cfg.hasKey ? 'Leave blank to keep the current key' : 'Paste the new vendor key'}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button onClick={() => saveCfg(form)} disabled={savingCfg}
              className="h-10 px-5 bg-blue-600 text-white rounded-lg text-[13px] font-semibold disabled:opacity-50">
              {savingCfg ? 'Saving…' : 'Save vendor'}
            </button>
            <button onClick={testCfg} disabled={savingCfg}
              className="h-10 px-5 border border-slate-200 text-slate-700 rounded-lg text-[13px] font-semibold">
              Test connection
            </button>
            {cfgMsg && <span className="text-[12.5px] text-slate-600">{cfgMsg}</span>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-900">Vendor APIs</h1>
        <button onClick={() => setEditing({ is_active: false, status: 'untested', headers: {}, request_format: {}, purchase_endpoint: '/purchase' })} className="h-9 px-4 bg-blue-600 text-white rounded-lg text-xs font-semibold">+ Add Vendor</button>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-slate-900 mb-4">{editing.id ? 'Edit' : 'New'} Vendor</h2>
            <div className="space-y-3">
              <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Vendor name" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
              <input value={editing.base_url || ''} onChange={e => setEditing({ ...editing, base_url: e.target.value })} placeholder="Base URL (https://api.vendor.com)" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
              <input value={editing.api_key || ''} onChange={e => setEditing({ ...editing, api_key: e.target.value })} placeholder="API Key" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
              <input value={editing.purchase_endpoint || ''} onChange={e => setEditing({ ...editing, purchase_endpoint: e.target.value })} placeholder="Purchase endpoint (e.g. /purchase)" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
              <textarea value={typeof editing.headers === 'object' ? JSON.stringify(editing.headers, null, 2) : editing.headers || ''} onChange={e => setEditing({ ...editing, headers: e.target.value as any })} placeholder='Headers JSON (e.g. {"X-Api-Key": "xxx"})' className="w-full h-20 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono" />
              <textarea value={typeof editing.request_format === 'object' ? JSON.stringify(editing.request_format, null, 2) : editing.request_format || ''} onChange={e => setEditing({ ...editing, request_format: e.target.value as any })} placeholder='Request format JSON. Use {phone}, {network}, {plan}, {amount}, {data}' className="w-full h-20 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono" />
              <input value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} placeholder="Notes" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={save} className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-sm font-semibold">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 h-10 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {testResult && (
        <div className="bg-slate-100 rounded-xl p-3 mb-4 text-sm">{testResult}</div>
      )}

      {/* Vendor list */}
      <div className="space-y-3">
        {vendors.map(v => (
          <div key={v.id} className={`bg-white rounded-xl border-2 p-4 transition ${v.is_active ? 'border-green-500' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{v.name}</span>
                  {v.is_active && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">ACTIVE</span>}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.status === 'connected' ? 'bg-green-100 text-green-700' : v.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{v.status}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{v.base_url}{v.purchase_endpoint}</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {!v.is_active && <button onClick={() => setActive(v.id)} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg font-semibold">Set Active</button>}
              <button onClick={() => testVendor(v.id)} disabled={testing === v.id} className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-semibold">{testing === v.id ? 'Testing...' : 'Test'}</button>
              <button onClick={() => setEditing(v)} className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-semibold">Edit</button>
              <button onClick={() => del(v.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-semibold">Delete</button>
            </div>
          </div>
        ))}
        {vendors.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No vendors configured. Add one to start fulfilling orders.</p>}
      </div>
    </div>
  )
}
