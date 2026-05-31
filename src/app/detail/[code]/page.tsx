'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { BRAND, NETWORK_LOGOS } from '@/lib/network-logos'
import type { Network, DataPlan } from '@/lib/types'

const GHS = (n: number) => `GH₵${n.toFixed(2)}`

export default function DetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [network, setNetwork] = useState<Network | null>(null)
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [selected, setSelected] = useState<DataPlan | null>(null)
  const [phone, setPhone] = useState('')
  const [paying, setPaying] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; order?: string; msg?: string } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: net } = await supabase.from('networks').select('*').eq('code', code).single()
      if (!net) return
      setNetwork(net)
      const { data: pls } = await supabase
        .from('data_plans')
        .select('*')
        .eq('network_id', net.id)
        .eq('is_active', true)
        .order('sort_order')
        .order('selling_price')
      setPlans(pls || [])
    }
    load()
  }, [code])

  const phoneOk = phone.replace(/\s/g, '').length >= 10
  const b = BRAND[code] || { bg: '#111', text: '#fff', short: code.slice(0, 3).toUpperCase() }
  const logo = network?.logo_url || NETWORK_LOGOS[code]

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
      if (!ps) { setPaying(false); setResult({ ok: false, msg: 'Payment script failed to load. Refresh and try again.' }); return }

      ps.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: d.paystack.email,
        amount: d.paystack.amount,
        currency: 'GHS',
        ref: d.paystack.reference,
        channels: ['mobile_money'],
        callback: () => { setResult({ ok: true, order: d.order.order_no }); setPaying(false) },
        onClose: () => setPaying(false),
      }).openIframe()
    } catch (e: any) {
      setPaying(false)
      setResult({ ok: false, msg: e.message })
    }
  }

  /* ── Result screen ── */
  if (result) return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm fade-up">
        {result.ok ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-5">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M4 11.5L8.5 16L18 6" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-xl font-black text-black mb-1">Order placed</h1>
            <p className="text-[13px] text-gray-400 mb-1">Your data is on its way.</p>
            <p className="text-[11px] text-gray-300 font-mono mb-6">{result.order}</p>
            <p className="text-[12px] text-gray-400 mb-7">
              Questions?{' '}
              <a href="https://wa.me/233533547740" target="_blank" className="text-black font-semibold underline underline-offset-2">
                Chat with us on WhatsApp
              </a>
            </p>
            <div className="flex gap-2">
              <a href="/" className="press flex-1 h-11 bg-black text-white rounded-xl text-[13px] font-bold flex items-center justify-center">
                Buy Again
              </a>
              <a href="/order" className="press flex-1 h-11 bg-gray-100 text-black rounded-xl text-[13px] font-semibold flex items-center justify-center">
                Track Order
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5l10 10M15 5L5 15" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="text-xl font-black text-black mb-1">Payment failed</h1>
            <p className="text-[13px] text-gray-400 mb-6">{result.msg || 'Please try again.'}</p>
            <button onClick={() => setResult(null)}
              className="press w-full h-11 bg-black text-white rounded-xl text-[13px] font-bold">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )

  /* ── Loading ── */
  if (!network) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-black transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </a>
          <div className="flex items-center">
            <span className="text-[15px] font-black text-black">Chale</span>
            <span className="text-[15px] font-black text-blue-600">Data</span>
          </div>
          <div className="w-10" />
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 pb-40">

        {/* ── Network header ── */}
        <div className="flex items-center gap-4 py-6 border-b border-gray-100">
          {logo
            ? <img src={logo} alt={network.name} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
            : <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                style={{ background: b.bg, color: b.text }}>{b.short}</div>
          }
          <div>
            <h1 className="text-[18px] font-black text-black leading-tight">{network.name}</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {plans.length > 0 ? `${plans.length} plans available` : 'No plans yet'}
            </p>
          </div>
        </div>

        {/* ── Phone input ── */}
        <div className="mt-6 mb-5">
          <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="024 000 0000"
            className="w-full h-12 px-4 text-[15px] font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
          />
        </div>

        {/* ── Plan list ── */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Choose a Plan
          </label>
          {plans.length === 0 ? (
            <p className="text-[13px] text-gray-300 py-12 text-center">No plans available yet.</p>
          ) : (
            <div className="space-y-2">
              {plans.map(p => {
                const on = selected?.id === p.id
                return (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className={`press w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left border transition-all ${
                      on
                        ? 'border-black bg-white shadow-[0_0_0_3px_rgba(0,0,0,0.06)]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <div>
                      <div className="text-[14px] font-bold text-black">{p.data_amount}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{p.name} · {p.validity}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[14px] font-bold text-black">{GHS(p.selling_price)}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        on ? 'border-black bg-black' : 'border-gray-300'
                      }`}>
                        {on && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky pay bar ── */}
      {selected && phoneOk && (
        <div className="fixed bottom-0 left-0 right-0 z-50 fade-up">
          <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-7 max-w-lg mx-auto">
            {/* Mini summary */}
            <div className="flex items-center justify-between text-[12px] text-gray-400 mb-3 px-1">
              <span>{selected.data_amount} · {selected.validity}</span>
              <span>{phone}</span>
            </div>
            <button
              onClick={pay}
              disabled={paying}
              className="press w-full h-12 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
              style={{ background: b.bg, color: b.text }}
            >
              {paying ? (
                <>
                  <span className="w-4 h-4 border-2 rounded-full animate-spin flex-shrink-0"
                    style={{ borderColor: `${b.text}40`, borderTopColor: b.text }} />
                  Processing…
                </>
              ) : (
                `Pay ${GHS(selected.selling_price)}`
              )}
            </button>
            <p className="text-center text-[11px] text-gray-300 mt-2">
              Mobile Money only · Secured by Paystack
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
