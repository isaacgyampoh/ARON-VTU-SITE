'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import type { Network, DataPlan } from '@/lib/types'

const GHS = (n: number) => `GH₵${n.toFixed(2)}`

const BRAND: Record<string, { bg: string; text: string; short: string }> = {
  mtn:        { bg: '#FFCC00', text: '#1a1a1a', short: 'MTN' },
  mtninstant: { bg: '#FFCC00', text: '#1a1a1a', short: 'MTN' },
  telecel:    { bg: '#CC0000', text: '#fff',     short: 'TEL' },
  at:         { bg: '#0033A0', text: '#fff',     short: 'AT'  },
  airteltigo: { bg: '#0033A0', text: '#fff',     short: 'AT'  },
  netflix:    { bg: '#E50914', text: '#fff',     short: 'NF'  },
  applemusic: { bg: '#FC3C44', text: '#fff',     short: 'AM'  },
  appletv:    { bg: '#000000', text: '#fff',     short: 'TV'  },
  applegames: { bg: '#0070C9', text: '#fff',     short: 'AG'  },
  icloud:     { bg: '#3693F5', text: '#fff',     short: 'iCL' },
  amazon:     { bg: '#00A8E1', text: '#fff',     short: 'AMZ' },
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
      const { data: pls } = await supabase.from('data_plans')
        .select('*').eq('network_id', net.id).eq('is_active', true)
        .order('sort_order').order('selling_price')
      setPlans(pls || [])
    }
    load()
  }, [code])

  const phoneOk = phone.replace(/\s/g, '').length >= 10
  const b = BRAND[code] || { bg: '#111', text: '#fff', short: code.slice(0, 3).toUpperCase() }

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

      const ps = (window as any).PaystackPop
      if (!ps) {
        setPaying(false)
        setResult({ ok: false, msg: 'Payment script not loaded. Please refresh and try again.' })
        return
      }

      const h = ps.setup({
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

  if (result) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center fade-up">
        {result.ok ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
            <h1 className="text-xl font-bold text-black mb-1">Order Placed!</h1>
            <p className="text-sm text-gray-400 mb-1">Your data is being sent to your number.</p>
            <p className="text-xs text-gray-300 font-mono mb-2">{result.order}</p>
            <p className="text-xs text-gray-400 mb-6">
              Need help?{' '}
              <a href="https://wa.me/233533547740" target="_blank" className="text-green-600 font-medium">WhatsApp us</a>
            </p>
            <div className="flex gap-2 justify-center">
              <a href="/" className="h-11 px-6 bg-black text-white rounded-xl text-sm font-semibold leading-[44px] press inline-block">Buy Again</a>
              <a href="/order" className="h-11 px-6 bg-gray-100 text-black rounded-xl text-sm font-semibold leading-[44px] press inline-block">Track Order</a>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl mx-auto mb-4">❌</div>
            <h1 className="text-xl font-bold text-black mb-1">Payment Failed</h1>
            <p className="text-sm text-gray-400 mb-6">{result.msg || 'Please try again.'}</p>
            <button onClick={() => setResult(null)} className="h-11 px-8 bg-black text-white rounded-xl text-sm font-semibold press">Try Again</button>
          </>
        )}
      </div>
    </div>
  )

  if (!network) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="h-14 px-4 flex items-center justify-between max-w-lg mx-auto border-b border-gray-100">
        <a href="/" className="text-sm text-gray-500 hover:text-black transition font-medium">← Back</a>
        <div>
          <span className="text-sm font-extrabold text-black">Chale</span>
          <span className="text-sm font-extrabold text-blue-600">Data</span>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 pb-32">
        {/* Product header */}
        <div className="flex items-center gap-4 my-6">
          {network.logo_url ? (
            <img src={network.logo_url} alt={network.name} className="w-14 h-14 rounded-2xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[11px] font-black flex-shrink-0"
              style={{ background: b.bg, color: b.text }}>
              {b.short}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-black">{network.name}</h1>
            <p className="text-xs text-gray-400">{plans.length > 0 ? `${plans.length} plans available` : 'No plans yet'}</p>
          </div>
        </div>

        {/* Phone */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Phone Number</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="024 000 0000" inputMode="numeric"
            className="w-full h-13 px-4 py-3.5 bg-gray-50 rounded-xl text-[16px] font-medium border border-gray-200 focus:outline-none focus:border-black focus:bg-white transition" />
        </div>

        {/* Plans */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Choose a Plan</label>
          {plans.length === 0 ? (
            <p className="text-sm text-gray-300 py-10 text-center">No plans available yet.</p>
          ) : (
            <div className="space-y-2">
              {plans.map(p => {
                const active = selected?.id === p.id
                return (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl text-left transition press border-2 ${
                      active ? 'border-black bg-black/[.02]' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <div>
                      <div className="text-sm font-bold text-black">{p.data_amount}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{p.name} · {p.validity}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-black">{GHS(p.selling_price)}</div>
                      {active && (
                        <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky pay button */}
      {selected && phoneOk && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 fade-up">
          <div className="max-w-lg mx-auto">
            <div className="flex justify-between text-xs text-gray-400 mb-2 px-1">
              <span>{selected.data_amount} · {selected.validity}</span>
              <span>{phone}</span>
            </div>
            <button onClick={pay} disabled={paying}
              className="w-full h-12 text-white rounded-xl text-sm font-bold press transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: b.bg, color: b.text }}>
              {paying
                ? <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Processing...</>
                : `Pay ${GHS(selected.selling_price)} via MoMo`
              }
            </button>
            <p className="text-center text-[11px] text-gray-300 mt-2">Secured by Paystack</p>
          </div>
        </div>
      )}
    </div>
  )
}
