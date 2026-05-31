'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import type { Network, DataPlan } from '@/lib/types'

const GHS = (n: number) => `GH₵ ${n.toFixed(2)}`

const COLORS: Record<string, { bg: string; text: string }> = {
  mtn: { bg: '#ffcb05', text: '#003366' },
  mtninstant: { bg: '#ffcb05', text: '#003366' },
  telecel: { bg: '#e60000', text: '#fff' },
  at: { bg: '#003eb3', text: '#fff' },
  airteltigo: { bg: '#003eb3', text: '#fff' },
  netflix: { bg: '#e50914', text: '#fff' },
  applemusic: { bg: '#fa2d48', text: '#fff' },
  appletv: { bg: '#1a1a1a', text: '#fff' },
  applegames: { bg: '#0070c9', text: '#fff' },
  icloud: { bg: '#3693f5', text: '#fff' },
  amazon: { bg: '#00a8e1', text: '#fff' },
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
  const c = COLORS[code] || COLORS.mtn

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
        {result.ok ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-black mb-1">Payment Successful</h1>
            <p className="text-sm text-gray-400 mb-1">Your data is being delivered.</p>
            <p className="text-xs text-gray-300 font-mono mb-6">{result.order}</p>
            <a href="/" className="inline-block h-11 px-8 bg-black text-white rounded-lg text-sm font-semibold leading-[44px] press">Buy Again</a>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-black mb-1">Payment Failed</h1>
            <p className="text-sm text-gray-400 mb-6">{result.msg || 'Please try again.'}</p>
            <button onClick={() => setResult(null)} className="h-11 px-8 bg-black text-white rounded-lg text-sm font-semibold press">Try Again</button>
          </>
        )}
      </div>
    </div>
  )

  if (!network) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen">
      {/* Header */}
      <nav className="h-14 px-4 flex items-center justify-between max-w-lg mx-auto">
        <a href="/" className="text-sm text-gray-400 hover:text-black transition">← Back</a>
        <div><span className="text-sm font-extrabold text-black">Chale</span><span className="text-sm font-extrabold text-blue-600">Data</span></div>
      </nav>

      <div className="max-w-lg mx-auto px-4 pb-16">
        {/* Product header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0"
            style={{ background: c.bg, color: c.text }}>
            {network.name.substring(0, 3).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">{network.name}</h1>
            {plans.length > 0 && <p className="text-xs text-gray-400">{plans.length} plans available</p>}
          </div>
        </div>

        {/* Phone */}
        <div className="mb-6">
          <label className="text-xs font-medium text-gray-500 mb-2 block">Phone number</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="024 000 0000"
            className="w-full h-12 px-4 bg-gray-50 rounded-lg text-[16px] font-medium border border-gray-200 focus:outline-none focus:border-black transition" />
        </div>

        {/* Plans */}
        <div className="mb-6">
          <label className="text-xs font-medium text-gray-500 mb-2 block">Choose a plan</label>
          {plans.length === 0 ? (
            <p className="text-sm text-gray-300 py-8 text-center">No plans available yet.</p>
          ) : (
            <div className="space-y-2">
              {plans.map(p => {
                const active = selected?.id === p.id
                return (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg text-left transition press border ${
                      active ? 'border-black bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <div>
                      <div className="text-sm font-semibold text-black">{p.data_amount}</div>
                      <div className="text-[11px] text-gray-400">{p.name} · {p.validity}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-black">{GHS(p.selling_price)}</div>
                      {active && <div className="text-[10px] text-green-600 font-medium">Selected ✓</div>}
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
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Phone</span><span className="font-medium">{phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Plan</span><span className="font-medium">{selected.data_amount} · {selected.validity}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2"><span className="text-gray-400">Total</span><span className="text-lg font-bold">{GHS(selected.selling_price)}</span></div>
            </div>
            <button onClick={pay} disabled={paying}
              className="w-full h-12 text-white rounded-lg text-sm font-bold press transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: c.bg, color: c.text }}>
              {paying ? 'Processing...' : `Pay ${GHS(selected.selling_price)}`}
            </button>
            <p className="text-center text-[11px] text-gray-300 mt-3">Secured by Paystack</p>
          </div>
        )}
      </div>
    </div>
  )
}
