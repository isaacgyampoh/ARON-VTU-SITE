'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import type { Network, DataPlan } from '@/lib/types'

const GHS = (n: number) => `GH₵ ${n.toFixed(2)}`

const NET_COLORS: Record<string, { bg: string; text: string; badge: string; border: string }> = {
  mtn: { bg: 'from-[#ffcb05] to-[#e6b800]', text: 'text-[#003366]', badge: 'bg-[#ffcb05] text-[#003366]', border: 'border-[#ffcb05]' },
  telecel: { bg: 'from-[#e60000] to-[#cc0000]', text: 'text-white', badge: 'bg-[#e60000] text-white', border: 'border-[#e60000]' },
  at: { bg: 'from-[#003eb3] to-[#002d80]', text: 'text-white', badge: 'bg-[#003eb3] text-white', border: 'border-[#003eb3]' },
  netflix: { bg: 'from-[#e50914] to-[#b20710]', text: 'text-white', badge: 'bg-[#e50914] text-white', border: 'border-[#e50914]' },
  applemusic: { bg: 'from-[#fa2d48] to-[#a834eb]', text: 'text-white', badge: 'bg-[#fa2d48] text-white', border: 'border-[#fa2d48]' },
  appletv: { bg: 'from-[#2d2d2d] to-[#1a1a1a]', text: 'text-white', badge: 'bg-[#2d2d2d] text-white', border: 'border-[#555]' },
  applegames: { bg: 'from-[#0070c9] to-[#00549e]', text: 'text-white', badge: 'bg-[#0070c9] text-white', border: 'border-[#0070c9]' },
  icloud: { bg: 'from-[#3693f5] to-[#2176d6]', text: 'text-white', badge: 'bg-[#3693f5] text-white', border: 'border-[#3693f5]' },
  amazon: { bg: 'from-[#00a8e1] to-[#0077b5]', text: 'text-white', badge: 'bg-[#00a8e1] text-white', border: 'border-[#00a8e1]' },
}

export default function DetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [network, setNetwork] = useState<Network | null>(null)
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [selected, setSelected] = useState<DataPlan | null>(null)
  const [phone, setPhone] = useState('')
  const [paying, setPaying] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: net } = await supabase.from('networks').select('*').eq('code', code).single()
      if (!net) return
      setNetwork(net)
      const { data: pls } = await supabase.from('data_plans').select('*').eq('network_id', net.id).eq('is_active', true).order('sort_order').order('selling_price')
      setPlans(pls || [])
    }
    load()
  }, [code])

  const phoneOk = phone.replace(/\s/g, '').length >= 10
  const isStreaming = ['netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon'].includes(code)
  const colors = NET_COLORS[code] || NET_COLORS.mtn

  async function pay() {
    if (!selected || !phoneOk) return
    setPaying(true)
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), network: code, planId: selected.id }),
      })
      const d = await r.json()
      if (!d.success) { setPaying(false); setResult({ ok: false, msg: d.error }); return }
      const h = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: d.paystack.email, amount: d.paystack.amount, currency: 'GHS', ref: d.paystack.reference,
        channels: ['mobile_money'],
        callback: () => { setResult({ ok: true, order: d.order.order_no }); setPaying(false) },
        onClose: () => setPaying(false),
      })
      h.openIframe()
    } catch (e: any) { setPaying(false); setResult({ ok: false, msg: e.message }) }
  }

  if (result) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center fade-up">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 ${result.ok ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {result.ok
            ? <svg width="36" height="36" fill="none" stroke="#059669" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
            : <svg width="36" height="36" fill="none" stroke="#dc2626" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          }
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{result.ok ? 'Success!' : 'Failed'}</h1>
        <p className="text-sm text-slate-500 mt-2 mb-6">{result.ok ? (isStreaming ? 'Your subscription is being activated.' : 'Your data is being delivered.') : result.msg}</p>
        {result.ok && <p className="text-xs text-slate-400 font-mono mb-6">{result.order}</p>}
        <button onClick={() => { setResult(null); setSelected(null); setPhone('') }} className="w-full h-12 bg-slate-900 text-white rounded-2xl font-semibold press">{result.ok ? 'Buy Again' : 'Try Again'}</button>
      </div>
    </div>
  )

  if (!network) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-7 h-7 border-[2.5px] border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className={`bg-gradient-to-br ${colors.bg} px-4 pt-4 pb-8 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
        <div className="relative max-w-lg mx-auto">
          <a href="/" className={`text-sm font-semibold ${colors.text} opacity-80 hover:opacity-100 transition`}>← Back</a>
          <h1 className={`text-2xl font-extrabold ${colors.text} mt-4`}>{network.name}</h1>
          <p className={`text-sm ${colors.text} opacity-70 mt-1`}>
            {isStreaming ? 'Streaming subscription' : 'Data bundles'}
            {plans.length > 0 && ` · ${plans.length} plans available`}
          </p>
          {plans.length > 0 && (
            <p className={`text-xs ${colors.text} opacity-50 mt-1`}>
              {GHS(Math.min(...plans.map(p => p.selling_price)))} — {GHS(Math.max(...plans.map(p => p.selling_price)))}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        {/* Phone input */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
          <label className="text-xs font-semibold text-slate-500 mb-2 block">
            {isStreaming ? 'Your phone number (for delivery)' : 'Recipient phone number'}
          </label>
          <div className="relative">
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="024 000 0000"
              className="w-full h-12 px-4 pr-12 bg-slate-50 rounded-xl text-[16px] font-semibold text-slate-900 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition placeholder:text-slate-300" />
            {phoneOk && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center scale-in">
                <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
            )}
          </div>
        </div>

        {/* Plans */}
        <div className="mb-4">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Choose a plan</h2>
          {plans.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
              <p className="text-sm text-slate-400">No plans available yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map(p => {
                const active = selected?.id === p.id
                return (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all duration-200 press border-2 ${
                      active ? `${colors.border} bg-white shadow-lg` : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{p.data_amount}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{p.name} · {p.validity}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-extrabold text-slate-900">{GHS(p.selling_price)}</div>
                      {active && <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Selected ✓</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Pay */}
        {selected && phoneOk && (
          <div className="fade-up">
            <div className="bg-slate-900 rounded-2xl p-4 mb-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Plan</span><span className="text-white font-semibold">{selected.data_amount}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Phone</span><span className="text-white font-mono">{phone}</span></div>
                <div className="flex justify-between pt-2 border-t border-slate-700/50"><span className="text-slate-400">Total</span><span className="text-xl font-extrabold text-white">{GHS(selected.selling_price)}</span></div>
              </div>
            </div>
            <button onClick={pay} disabled={paying}
              className="w-full h-14 bg-blue-600 text-white rounded-2xl text-base font-bold press hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {paying ? <><div className="w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" /> Processing...</> : <>Pay {GHS(selected.selling_price)} →</>}
            </button>
            <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-slate-400">
              <span>🔒 Secured by Paystack</span><span>⚡ Instant delivery</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
