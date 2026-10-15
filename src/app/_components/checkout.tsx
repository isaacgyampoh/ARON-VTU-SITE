'use client'

import Link from 'next/link'
import { useState } from 'react'
import Script from 'next/script'
import { BRAND, NETWORK_LOGOS } from '@/lib/network-logos'
import type { Network, PublicPlan } from '@/lib/types'

const GHS = (n: number) => `GH₵${Number(n).toFixed(2)}`
const STREAM_CODES = ['netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon']

type PaystackHandler = { openIframe: () => void }
type PaystackPop = {
  setup: (options: Record<string, unknown>) => PaystackHandler
}

/**
 * Plan picker and payment.
 *
 * The plans arrive from the server, so the page has content before any
 * JavaScript runs; only the selection and the Paystack handoff are client-side.
 */
export default function Checkout({ network, plans }: { network: Network; plans: PublicPlan[] }) {
  const code = network.code
  const [selected, setSelected] = useState<PublicPlan | null>(plans[0] ?? null)
  const [phone, setPhone] = useState('')
  const [paying, setPaying] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; order?: string; msg?: string } | null>(null)

  const phoneOk = phone.replace(/\s/g, '').length >= 10
  const b = BRAND[code] || { bg: '#111', text: '#fff', short: code.slice(0, 3).toUpperCase() }

  async function pay() {
    if (!selected || !phoneOk || paying) return
    setPaying(true)
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), network: code, planId: selected.id }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.success) {
        setPaying(false)
        setResult({ ok: false, msg: d.error || 'Could not start this order.' })
        return
      }

      const ps = (window as unknown as { PaystackPop?: PaystackPop }).PaystackPop
      if (!ps) {
        setPaying(false)
        setResult({ ok: false, msg: 'Payment script failed to load. Please refresh and try again.' })
        return
      }

      const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
      if (!paystackKey) {
        setPaying(false)
        setResult({ ok: false, msg: 'Payment not configured. Please contact support on WhatsApp.' })
        return
      }

      if (!d.paystack?.amount || d.paystack.amount <= 0) {
        setPaying(false)
        setResult({ ok: false, msg: 'Invalid amount. Please contact support on WhatsApp.' })
        return
      }

      ps.setup({
        key: paystackKey,
        email: d.paystack.email,
        amount: d.paystack.amount,
        currency: 'GHS',
        ref: d.paystack.reference,
        channels: ['mobile_money'],
        callback: () => { setResult({ ok: true, order: d.orderNo }); setPaying(false) },
        onClose: () => setPaying(false),
      }).openIframe()
    } catch {
      setPaying(false)
      setResult({ ok: false, msg: 'Something went wrong. Please try again.' })
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
              <a href="https://wa.me/233558659948" target="_blank" rel="noopener noreferrer" className="text-black font-semibold underline underline-offset-2">
                Chat with us on WhatsApp
              </a>
            </p>
            <div className="flex gap-2">
              <Link href="/" className="press flex-1 h-11 bg-black text-white rounded-xl text-[13px] font-bold flex items-center justify-center">
                Buy Again
              </Link>
              <Link href="/order" className="press flex-1 h-11 bg-gray-100 text-black rounded-xl text-[13px] font-semibold flex items-center justify-center">
                Track Order
              </Link>
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
            <button onClick={() => setResult(null)} className="press w-full h-11 bg-black text-white rounded-xl text-[13px] font-bold">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const prices = plans.map(p => Number(p.selling_price))
  const priceRange = prices.length > 0
    ? (() => {
        const min = Math.min(...prices)
        const max = Math.max(...prices)
        return min === max ? GHS(min) : `${GHS(min)} – ${GHS(max)}`
      })()
    : null

  const logo = network.logo_url || NETWORK_LOGOS[code]

  return (
    <div className="min-h-screen bg-white">
      <Script src="https://js.paystack.co/v2/inline.js" strategy="lazyOnload" />

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-black transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>
          <div className="flex items-center">
            <span className="text-[15px] font-black text-black">Chale</span>
            <span className="text-[15px] font-black text-blue-600">Data</span>
          </div>
          <div className="w-10" />
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-44">

        {/* ── Network name + price range ── */}
        <div className="mb-6 flex items-center gap-3">
          {logo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logo} alt="" aria-hidden width={44} height={44}
              className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
          )}
          <div>
            <h1 className="text-[26px] font-black text-black leading-tight">{network.name}</h1>
            {priceRange && <p className="text-[15px] text-gray-400 mt-0.5">{priceRange}</p>}
          </div>
        </div>

        {/* ── MTN delivery time ── shown on MTN products before choosing a
             plan, matching the existing notice style. */}
        {code.startsWith('mtn') && (
          <div className="mb-5 border-l-4 border-amber-500 pl-4 py-1">
            <p className="text-[13px] font-bold text-black mb-0.5">Delivery can take up to 24 hours</p>
            <p className="text-[12px] text-gray-500 leading-relaxed">
              MTN bundles are not always instant. Only order if you can wait.
            </p>
          </div>
        )}

        {/* ── AFA notice ── */}
        {code === 'mtnafa' && (
          <div className="mb-5 border-l-4 border-black pl-4 py-1">
            <p className="text-[13px] font-bold text-black mb-0.5">Ghana Card Required</p>
            <p className="text-[12px] text-gray-500 leading-relaxed">
              After payment, we&apos;ll contact you on WhatsApp to collect your Ghana Card ID and complete your AFA registration.
            </p>
          </div>
        )}

        {/* ── Plan selector: grid for data, list for streaming ── */}
        {plans.length > 0 && (STREAM_CODES.includes(code) ? (
          /* Streaming: vertical duration cards */
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Choose Duration</p>
            <div className="space-y-2">
              {plans.map(p => {
                const on = selected?.id === p.id
                return (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className={`press w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                      on ? 'border-black bg-black/[.02]' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <div>
                      <div className="text-[15px] font-bold text-black">{p.data_amount}</div>
                      {p.name && p.name !== p.data_amount && (
                        <div className="text-[11px] text-gray-400 mt-0.5">{p.name}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] font-bold text-black">{GHS(p.selling_price)}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${on ? 'border-black bg-black' : 'border-gray-300'}`}>
                        {on && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          /* Data: compact grid of sizes */
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Data Size</p>
            <div className="grid grid-cols-4 gap-2">
              {plans.map(p => {
                const on = selected?.id === p.id
                return (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className={`press h-12 rounded-xl text-[13px] font-bold border-2 transition-all ${
                      on ? 'text-white border-transparent' : 'bg-white text-black border-gray-200 hover:border-gray-300'
                    }`}
                    style={on ? { background: b.bg, color: b.text, borderColor: b.bg } : {}}>
                    {p.data_amount}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* ── Price display ── */}
        {selected && (
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Price</p>
            <div className="flex items-baseline gap-1">
              <span className="text-[15px] font-semibold text-gray-500">GH₵</span>
              <span className="text-[42px] font-black text-black leading-none">
                {Number(selected.selling_price).toFixed(2).split('.')[0]}
              </span>
              <span className="text-[22px] font-black text-black leading-none">
                .{Number(selected.selling_price).toFixed(2).split('.')[1]}
              </span>
            </div>
            <p className="text-[12px] text-gray-400 mt-1">{selected.name} · {selected.validity}</p>
          </div>
        )}

        {/* ── Phone input ── */}
        <div className="mb-6">
          <label htmlFor="beneficiary" className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Beneficiary Phone Number <span className="text-red-400">*</span>
          </label>
          <input
            id="beneficiary"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="enter number here"
            className="w-full h-12 px-4 text-[15px] font-medium bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-all placeholder:text-gray-300"
          />
        </div>

        {/* ── No plans ── */}
        {plans.length === 0 && (
          <p className="text-[13px] text-gray-300 py-12 text-center">No plans available yet.</p>
        )}

      </div>

      {/* ── Sticky BUY button ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-8 max-w-lg mx-auto">
          <button
            onClick={pay}
            disabled={paying || !selected || !phoneOk}
            className="press w-full h-14 rounded-xl text-[15px] font-black tracking-wide flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
            style={{ background: b.bg, color: b.text }}
          >
            {paying ? (
              <>
                <span className="w-4 h-4 border-2 rounded-full animate-spin flex-shrink-0"
                  style={{ borderColor: `${b.text}40`, borderTopColor: b.text }} />
                Processing…
              </>
            ) : (
              selected && phoneOk
                ? `BUY — ${GHS(selected.selling_price)}`
                : !selected
                ? 'Select a plan'
                : 'Enter phone number'
            )}
          </button>
          <p className="text-center text-[11px] text-gray-300 mt-2">Mobile Money · Secured by Paystack</p>
        </div>
      </div>

    </div>
  )
}
