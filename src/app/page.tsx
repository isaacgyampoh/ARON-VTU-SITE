'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BRAND, NETWORK_LOGOS } from '@/lib/network-logos'
import type { Network, DataPlan } from '@/lib/types'

const GHS = (n: number) => `GH₵${n.toFixed(2)}`
const DATA_TYPES = ['mtn', 'mtninstant', 'mtnafa', 'telecel', 'at', 'airteltigo']
const STREAM_TYPES = ['netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon']

export default function Home() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'data' | 'streaming'>('data')

  // The hero alternates between what we sell today and what is coming, so the
  // susu gets real exposure without a banner shouting over the shop.
  const HERO = [
    { top: 'Data & Streaming,', bottom: 'Delivered Fast', accent: '#2563eb',
      sub: 'Pay with mobile money. No account needed.' },
    { top: 'Cresco Susu,', bottom: 'Coming Soon', accent: '#059669',
      sub: 'Save today, secure tomorrow. Stay tuned.' },
  ]
  const [heroIdx, setHeroIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO.length), 4200)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    async function load() {
      const [{ data: n }, { data: p }] = await Promise.all([
        supabase.from('networks').select('*').eq('is_active', true).order('name'),
        supabase.from('data_plans').select('*').eq('is_active', true).order('selling_price'),
      ])
      setNetworks(n || [])
      setPlans(p || [])
      setLoading(false)
    }
    load()
  }, [])

  const dataNets = networks.filter(n => DATA_TYPES.includes(n.code) || n.type === 'data')
  const streamNets = networks.filter(n => STREAM_TYPES.includes(n.code) || n.type === 'streaming')

  function priceRange(id: string) {
    const p = plans.filter(x => x.network_id === id)
    if (!p.length) return null
    const min = Math.min(...p.map(x => x.selling_price))
    const max = Math.max(...p.map(x => x.selling_price))
    return min === max ? GHS(min) : `${GHS(min)} – ${GHS(max)}`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
    </div>
  )

  const activeNets = tab === 'data' ? dataNets : streamNets

  return (
    <div className="min-h-screen bg-[#f5f5f7]">

      {/* ── Nav ── the brand carries the header on its own; help and order
           tracking live in the bottom bar on mobile and the footer elsewhere. */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="relative max-w-4xl mx-auto px-4 h-[58px] flex items-center justify-center">
          <a href="/" className="flex items-center" aria-label="ChaleData home">
            <span className="text-[21px] font-black text-black tracking-[-0.03em]">Chale</span>
            <span className="text-[21px] font-black text-blue-600 tracking-[-0.03em]">Data</span>
          </a>
          <a href="/order"
            className="hidden sm:block absolute right-4 text-[13px] font-medium text-gray-500 hover:text-black transition-colors">
            Track Order
          </a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pb-28 sm:pb-16">

        {/* ── Hero ── */}
        <div className="pt-12 pb-7 text-center">
          <div className="relative h-[86px] md:h-[104px] overflow-hidden">
            {HERO.map((h, i) => (
              <h1 key={i}
                className="absolute inset-x-0 top-0 text-[30px] md:text-[40px] font-black text-black leading-[1.1] tracking-[-0.02em] transition-all duration-[650ms]"
                style={{
                  transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)',
                  opacity: heroIdx === i ? 1 : 0,
                  transform: heroIdx === i ? 'translateX(0)' : (i < heroIdx ? 'translateX(-36px)' : 'translateX(36px)'),
                }}>
                {h.top}<br />
                <span style={{ color: h.accent }}>{h.bottom}</span>
              </h1>
            ))}
          </div>

          <div className="relative h-[46px] sm:h-[26px] overflow-hidden mt-2.5">
            {HERO.map((h, i) => (
              <p key={i}
                className="absolute inset-x-0 top-0 text-[14.5px] text-gray-500 max-w-[320px] mx-auto leading-relaxed transition-all duration-[650ms]"
                style={{
                  transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)',
                  opacity: heroIdx === i ? 1 : 0,
                  transform: heroIdx === i ? 'translateX(0)' : 'translateX(24px)',
                }}>
                {h.sub}
              </p>
            ))}
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-4">
            {HERO.map((_, i) => (
              <button key={i} onClick={() => setHeroIdx(i)} aria-label={`View slide ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: heroIdx === i ? 18 : 6, height: 6,
                  background: heroIdx === i ? HERO[i].accent : '#d4d4d8',
                }} />
            ))}
          </div>

          {/* Trust row — people are about to pay, so say what reassures them */}
          <div className="flex items-center justify-center gap-4 mt-6 text-[11.5px] font-medium text-gray-400">
            <span className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              Secure payment
            </span>
            <span className="w-px h-3 bg-gray-200" />
            <span className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              Track any order
            </span>
          </div>
        </div>

        {/* ── Delivery notice ── seen before choosing, so nobody orders
             expecting instant delivery and is disappointed. */}
        <div className="mb-7 rounded-2xl bg-amber-50 border border-amber-200/70 px-4 py-3.5 flex gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-[1px]"
            stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16.5v.01" />
          </svg>
          <p className="text-[13px] leading-relaxed text-amber-900">
            <span className="font-bold">MTN delivery can take up to 24 hours.</span>{' '}
            <span className="text-amber-800">Only order if you can wait.</span>
          </p>
        </div>

        {/* ── Tab switcher ── */}
        {dataNets.length > 0 && streamNets.length > 0 && (
          <div className="flex gap-1 p-1 bg-white ring-1 ring-gray-200/70 rounded-2xl w-fit mx-auto mb-7 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
            {(['data', 'streaming'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-6 h-9 rounded-xl text-[13px] font-bold transition-all ${
                  tab === t ? 'bg-black text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'
                }`}>
                {t === 'data' ? 'Data' : 'Streaming'}
              </button>
            ))}
          </div>
        )}

        {/* ── Network card grid ── */}
        <div className="flex items-baseline justify-between mb-3.5">
          <h2 className="text-[15px] font-bold text-black tracking-tight">
            {tab === 'data' ? 'Choose a network' : 'Choose a service'}
          </h2>
          <span className="text-[12px] text-gray-400">{activeNets.length} available</span>
        </div>

        {activeNets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {activeNets.map(n => {
              const logo = n.logo_url || NETWORK_LOGOS[n.code]
              const b = BRAND[n.code] || { bg: '#e5e7eb', text: '#111', short: n.code.slice(0,3).toUpperCase() }
              const range = priceRange(n.id)
              const count = plans.filter(p => p.network_id === n.id).length

              return (
                <a key={n.id} href={`/detail/${n.code}`}
                  className="press group relative overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,.04)] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,.18)] hover:ring-gray-300 hover:-translate-y-0.5 transition-all duration-200 flex flex-col">

                  {/* Card image area */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden"
                    style={{ background: logo ? b.bg : b.bg }}>
                    {logo ? (
                      <img
                        src={logo}
                        alt={n.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[32px] font-black" style={{ color: b.text }}>
                          {b.short}
                        </span>
                      </div>
                    )}

                    {/* Count badge */}
                    {count > 0 && (
                      <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {count} {count === 1 ? 'plan' : 'plans'}
                      </div>
                    )}
                  </div>

                  {/* Card footer */}
                  <div className="px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13.5px] font-bold text-black truncate">{n.name}</div>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 group-hover:bg-black flex items-center justify-center transition-colors">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-gray-400 group-hover:text-white transition-colors">
                          <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    <div className="text-[11.5px] mt-1 truncate">
                      {range
                        ? <><span className="text-gray-400">from </span><span className="font-semibold text-gray-700">{range.split(' – ')[0]}</span></>
                        : <span className="text-gray-300">Coming soon</span>}
                    </div>
                  </div>

                </a>
              )
            })}
          </div>
        ) : (
          <p className="text-center text-gray-300 py-20 text-sm">No products available yet.</p>
        )}

        {/* ── Cresco Susu teaser ── placed after the products, so it is seen
             on the way out rather than distracting from a purchase. */}
        <a href="/cresco"
          className="press group block mt-14 rounded-2xl overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #07231a, #0d3b2a)' }}>
          <div aria-hidden className="absolute inset-0" style={{
            background: 'radial-gradient(90% 120% at 88% 0%, rgba(16,185,129,.22), transparent 62%)',
          }} />
          <div className="relative flex items-center gap-4 px-5 py-5">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(155deg, #10b981, #059669)' }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white"
                strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21V11" />
                <path d="M12 11c0-3.5 2.6-6.4 6-6.8-.2 3.6-2.7 6.4-6 6.8Z" />
                <path d="M12 14c-3.1-.3-5.5-2.9-5.7-6.2 3.2.4 5.6 3 5.7 6.2Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-black text-white tracking-tight">Cresco Susu</span>
                <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(212,175,55,.16)', color: '#e3c766' }}>Coming soon</span>
              </div>
              <p className="text-[12.5px] text-white/55 mt-1 leading-snug">
                Save today, secure tomorrow. Our rotational savings plan.
              </p>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:translate-x-0.5"
              style={{ background: 'rgba(255,255,255,.10)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </a>

        {/* ── Footer ── */}
        <footer className="mt-20 pt-12 border-t border-gray-200/80">

          {/* Brand, centred */}
          <div className="text-center max-w-sm mx-auto">
            <div className="flex items-center justify-center mb-3">
              <span className="text-[19px] font-black text-black tracking-[-0.03em]">Chale</span>
              <span className="text-[19px] font-black text-blue-600 tracking-[-0.03em]">Data</span>
            </div>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Data and streaming for Ghana. Pay with mobile money — no account, no sign-up.
            </p>
          </div>

          {/* Shop · Good to know · Support */}
          <div className="mt-11 grid grid-cols-1 sm:grid-cols-3 gap-9 sm:gap-6">

            <div className="text-center sm:text-left">
              <span className="block text-[11px] font-bold uppercase tracking-[0.09em] text-gray-400 mb-3">Shop</span>
              <div className="flex flex-col gap-2.5">
                <a href="/" className="text-[13.5px] text-gray-600 hover:text-black transition-colors">Data bundles</a>
                <a href="/" className="text-[13.5px] text-gray-600 hover:text-black transition-colors">Streaming</a>
                <a href="/order" className="text-[13.5px] text-gray-600 hover:text-black transition-colors">Track order</a>
                <a href="/cresco" className="text-[13.5px] text-gray-600 hover:text-black transition-colors">
                  Cresco Susu <span className="text-[10px] text-emerald-600 font-semibold">soon</span>
                </a>
              </div>
            </div>

            <div className="text-center">
              <span className="block text-[11px] font-bold uppercase tracking-[0.09em] text-gray-400 mb-3">Good to know</span>
              <div className="flex flex-col gap-2.5">
                <span className="text-[13.5px] text-gray-600 leading-relaxed">MTN delivery can take up to 24 hours</span>
                <span className="text-[13.5px] text-gray-500">Payments secured by Paystack</span>
              </div>
            </div>

            <div className="text-center sm:text-right">
              <span className="block text-[11px] font-bold uppercase tracking-[0.09em] text-gray-400 mb-3">Support</span>
              <div className="flex flex-col gap-2.5">
                <a href="https://wa.me/233558659948" target="_blank" rel="noopener noreferrer"
                  className="text-[13.5px] text-gray-600 hover:text-black transition-colors">WhatsApp us</a>
                <a href="tel:0558659948" className="text-[13.5px] text-gray-600 hover:text-black transition-colors">055 865 9948</a>
                <span className="text-[13.5px] text-gray-500">Mon – Sun, 8am – 9pm</span>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-gray-200/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11.5px] text-gray-400">&copy; {new Date().getFullYear()} ChaleData. All rights reserved.</p>
            <div className="flex items-center gap-2 text-[11.5px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              All systems operational
            </div>
          </div>
        </footer>

      </div>

      {/* ── Mobile action bar ── always reachable with a thumb, the way an app
           behaves, instead of making people scroll back to the top. ── */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2 px-4 pt-2.5 pb-2">
          <a href="/order"
            className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-800 text-[13.5px] font-bold flex items-center justify-center gap-2 active:scale-[.98] transition-transform">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            Track order
          </a>
          <a href="https://wa.me/233558659948" target="_blank" rel="noopener noreferrer"
            className="flex-1 h-11 rounded-xl text-white text-[13.5px] font-bold flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
            style={{ background: '#25D366' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
              <path d="M12.001 2C6.478 2 2 6.478 2 12c0 1.846.502 3.574 1.37 5.063L2 22l5.09-1.33A9.956 9.956 0 0012.001 22C17.523 22 22 17.522 22 12S17.523 2 12.001 2zm0 1.8A8.2 8.2 0 0120.2 12a8.2 8.2 0 01-8.199 8.2 8.167 8.167 0 01-4.17-1.14l-.299-.18-3.1.81.828-3.02-.196-.31A8.164 8.164 0 013.8 12 8.2 8.2 0 0112.001 3.8z"/>
            </svg>
            Get help
          </a>
        </div>
      </div>

    </div>
  )
}
