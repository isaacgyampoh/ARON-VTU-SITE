'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Network, DataPlan } from '@/lib/types'

const GHS = (n: number) => `GH₵ ${n.toFixed(2)}`

const NET_STYLE: Record<string, { bg: string; ring: string; text: string; icon: string }> = {
  mtn: { bg: 'bg-[#ffcb05]', ring: 'ring-[#ffcb05]', text: 'text-[#003366]', icon: '🟡' },
  telecel: { bg: 'bg-[#e60000]', ring: 'ring-[#e60000]', text: 'text-white', icon: '🔴' },
  at: { bg: 'bg-[#003eb3]', ring: 'ring-[#003eb3]', text: 'text-white', icon: '🔵' },
}

export default function Home() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [net, setNet] = useState('')
  const [phone, setPhone] = useState('')
  const [plan, setPlan] = useState<DataPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [result, setResult] = useState<any>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('networks').select('*').eq('is_active', true).order('name'),
      supabase.from('data_plans').select('*').eq('is_active', true).order('sort_order').order('selling_price'),
    ]).then(([{ data: n }, { data: p }]) => {
      setNetworks(n || [])
      setPlans(p || [])
      setLoading(false)
    })
  }, [])

  const filtered = plans.filter(p => networks.find(n => n.id === p.network_id)?.code === net)
  const phoneOk = phone.replace(/\s/g, '').length >= 10

  function selectNet(code: string) {
    setNet(code)
    setPlan(null)
    setTimeout(() => phoneRef.current?.focus(), 100)
  }

  async function pay() {
    if (!plan || !phoneOk) return
    setPaying(true)
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), network: net, planId: plan.id }),
      })
      const d = await r.json()
      if (!d.success) { setPaying(false); setResult({ ok: false, msg: d.error }); return }

      const h = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: d.paystack.email,
        amount: d.paystack.amount,
        currency: 'GHS',
        ref: d.paystack.reference,
        channels: ['mobile_money'],
        callback: () => { setResult({ ok: true, order: d.order.order_no }); setPaying(false) },
        onClose: () => setPaying(false),
      })
      h.openIframe()
    } catch (e: any) {
      setPaying(false)
      setResult({ ok: false, msg: e.message })
    }
  }

  // Result screen
  if (result) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center fade-up">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 ${result.ok ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {result.ok
            ? <svg width="36" height="36" fill="none" stroke="#059669" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
            : <svg width="36" height="36" fill="none" stroke="#dc2626" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          }
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{result.ok ? 'Data Sent!' : 'Payment Failed'}</h1>
        <p className="text-sm text-slate-500 mt-2 mb-6">{result.ok ? 'Your data bundle is being delivered to your number.' : result.msg || 'Something went wrong. Try again.'}</p>
        {result.ok && (
          <div className="bg-slate-50 rounded-2xl p-4 text-left mb-6 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Order</span><span className="font-mono font-semibold text-slate-800">{result.order}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Number</span><span className="font-semibold text-slate-800">{phone}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Bundle</span><span className="font-semibold text-slate-800">{plan?.data_amount} · {plan?.validity}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Amount</span><span className="font-bold text-slate-900">{plan && GHS(plan.selling_price)}</span></div>
          </div>
        )}
        <button onClick={() => { setResult(null); setPlan(null); setPhone(''); setNet('') }} className="w-full h-12 bg-slate-900 text-white rounded-2xl font-semibold press transition hover:bg-slate-800">{result.ok ? 'Buy More Data' : 'Try Again'}</button>
      </div>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center fade-up">
        <div className="text-xl font-extrabold text-slate-900 tracking-tight mb-3">ChaleData</div>
        <div className="w-7 h-7 border-[2.5px] border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="px-4 h-16 flex items-center justify-between max-w-lg mx-auto">
        <div>
          <span className="text-lg font-extrabold text-slate-900 tracking-tight">Chale</span>
          <span className="text-lg font-extrabold text-blue-600 tracking-tight">Data</span>
        </div>
        <a href="/order" className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition">Track Order</a>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 mx-4 rounded-3xl p-6 mb-8 max-w-lg sm:mx-auto relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #60a5fa 0%, transparent 40%)' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur px-3 py-1 rounded-full mb-4">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Instant Delivery</span>
          </div>
          <h1 className="text-white text-[22px] font-extrabold leading-tight mb-2">Buy Data<br />In Seconds.</h1>
          <p className="text-blue-200/60 text-xs leading-relaxed">MTN · Telecel · AirtelTigo<br />No signup. No wallet. Just pay and go.</p>
        </div>
      </div>

      {/* Main checkout */}
      <div className="max-w-lg mx-auto px-4 pb-20">
        {/* Network */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">1</div>
            <span className="text-sm font-semibold text-slate-700">Select Network</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {networks.map(n => {
              const s = NET_STYLE[n.code] || NET_STYLE.mtn
              const active = net === n.code
              return (
                <button key={n.code} onClick={() => selectNet(n.code)}
                  className={`h-16 rounded-2xl font-bold text-sm transition-all duration-200 press border-2 ${
                    active ? `${s.bg} ${s.text} border-transparent shadow-lg shadow-black/10 scale-[1.03]` : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}>
                  <span className="text-lg">{s.icon}</span>
                  <div className="mt-0.5">{n.name}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Phone */}
        {net && (
          <div className="mb-5 fade-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">2</div>
              <span className="text-sm font-semibold text-slate-700">Phone Number</span>
            </div>
            <div className="relative">
              <input
                ref={phoneRef}
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="024 000 0000"
                className="w-full h-14 px-4 pr-12 bg-white rounded-2xl text-[16px] font-semibold text-slate-900 border-2 border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition placeholder:text-slate-300 placeholder:font-normal"
              />
              {phoneOk && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center scale-in">
                  <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bundles */}
        {net && phoneOk && (
          <div className="mb-5 fade-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">3</div>
              <span className="text-sm font-semibold text-slate-700">Choose Bundle</span>
            </div>
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-400">No bundles available for this network yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {filtered.map(p => {
                  const active = plan?.id === p.id
                  const s = NET_STYLE[net]
                  return (
                    <button key={p.id} onClick={() => setPlan(p)}
                      className={`p-4 rounded-2xl text-left transition-all duration-200 press border-2 ${
                        active ? `${s.ring} ring-2 ring-offset-2 border-transparent bg-white shadow-lg` : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}>
                      <div className="text-xl font-extrabold text-slate-900 leading-none">{p.data_amount}</div>
                      <div className="text-[11px] text-slate-400 mt-1 font-medium">{p.validity}</div>
                      <div className="text-base font-bold text-blue-600 mt-2">{GHS(p.selling_price)}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Pay button */}
        {plan && phoneOk && (
          <div className="fade-up">
            {/* Summary */}
            <div className="bg-slate-900 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Summary</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${NET_STYLE[net]?.bg} ${NET_STYLE[net]?.text}`}>{net.toUpperCase()}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-slate-400">Phone</span><span className="text-white font-mono">{phone}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Bundle</span><span className="text-white font-semibold">{plan.data_amount} · {plan.validity}</span></div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-700/50 mt-2">
                  <span className="text-xs text-slate-400">Total</span>
                  <span className="text-2xl font-extrabold text-white">{GHS(plan.selling_price)}</span>
                </div>
              </div>
            </div>

            <button onClick={pay} disabled={paying}
              className="w-full h-14 bg-blue-600 text-white rounded-2xl text-base font-bold press transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {paying ? (
                <><div className="w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
              ) : (
                <>Pay {GHS(plan.selling_price)} →</>
              )}
            </button>

            {/* Trust */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                Secured by Paystack
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Instant delivery
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-slate-200 text-center">
          <div className="mb-2">
            <span className="text-sm font-extrabold text-slate-900">Chale</span>
            <span className="text-sm font-extrabold text-blue-600">Data</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Buy affordable data bundles instantly.<br />No signup needed.</p>
          <div className="flex justify-center gap-4 text-[11px] text-slate-400">
            <a href="/order" className="hover:text-blue-600 transition">Track Order</a>
            <span>·</span>
            <a href="/admin" className="hover:text-blue-600 transition">Admin</a>
          </div>
          <p className="text-[10px] text-slate-300 mt-4">&copy; {new Date().getFullYear()} ChaleData</p>
        </div>
      </div>
    </div>
  )
}
