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

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <span className="text-[18px] font-black text-black tracking-tight">Chale</span>
            <span className="text-[18px] font-black text-blue-600 tracking-tight">Data</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/order" className="text-[13px] text-gray-500 hover:text-black transition-colors hidden sm:block">
              Track Order
            </a>
            <a href="https://wa.me/233558659948" target="_blank" rel="noopener noreferrer"
              aria-label="Chat with us on WhatsApp"
              className="inline-flex items-center gap-2 h-9 pl-2.5 pr-3.5 rounded-full bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 hover:border-gray-300 hover:text-black transition-colors">
              <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#25D366' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                  <path d="M12.001 2C6.478 2 2 6.478 2 12c0 1.846.502 3.574 1.37 5.063L2 22l5.09-1.33A9.956 9.956 0 0012.001 22C17.523 22 22 17.522 22 12S17.523 2 12.001 2zm0 1.8A8.2 8.2 0 0120.2 12a8.2 8.2 0 01-8.199 8.2 8.167 8.167 0 01-4.17-1.14l-.299-.18-3.1.81.828-3.02-.196-.31A8.164 8.164 0 013.8 12 8.2 8.2 0 0112.001 3.8zm-2.425 4.4c-.198 0-.52.074-.793.37-.272.296-1.04 1.016-1.04 2.479s1.064 2.876 1.213 3.074c.149.198 2.051 3.274 5.063 4.461.708.271 1.26.433 1.69.555.71.2 1.357.172 1.868.104.57-.076 1.754-.717 2.002-1.41.247-.692.247-1.285.173-1.41-.074-.123-.272-.197-.57-.346-.298-.149-1.755-.866-2.027-.966-.272-.099-.47-.148-.669.149-.198.297-.768.966-.942 1.164-.173.198-.347.223-.644.074-.298-.148-1.258-.464-2.397-1.48-.886-.79-1.485-1.766-1.659-2.063-.173-.298-.018-.459.13-.607.134-.134.298-.347.447-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.074-.149-.669-1.613-.916-2.208-.24-.578-.486-.5-.669-.51a12.17 12.17 0 00-.572-.01z"/>
                </svg>
              </span>
              <span className="hidden xs:inline sm:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pb-28 sm:pb-16">

        {/* ── Hero ── */}
        <div className="pt-12 pb-7 text-center">
          <h1 className="text-[30px] md:text-[40px] font-black text-black leading-[1.1] tracking-[-0.02em]">
            Data &amp; Streaming,<br />
            <span className="text-blue-600">Delivered Fast</span>
          </h1>
          <p className="text-[14.5px] text-gray-500 mt-3.5 max-w-[280px] mx-auto leading-relaxed">
            Pay with mobile money. No account needed.
          </p>

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

        {/* ── Footer ── */}
        <footer className="mt-20 pt-10 border-t border-gray-200/80">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-9">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center mb-2.5">
                <span className="text-[16px] font-black text-black tracking-tight">Chale</span>
                <span className="text-[16px] font-black text-blue-600 tracking-tight">Data</span>
              </div>
              <p className="text-[12.5px] text-gray-500 leading-relaxed max-w-[210px]">
                Data and streaming for Ghana. Pay with mobile money, no account needed.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-gray-400">Shop</span>
              <a href="/" className="text-[13px] text-gray-600 hover:text-black transition-colors">Data bundles</a>
              <a href="/" className="text-[13px] text-gray-600 hover:text-black transition-colors">Streaming</a>
              <a href="/order" className="text-[13px] text-gray-600 hover:text-black transition-colors">Track order</a>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-gray-400">Support</span>
              <a href="https://wa.me/233558659948" target="_blank" rel="noopener noreferrer"
                className="text-[13px] text-gray-600 hover:text-black transition-colors">WhatsApp us</a>
              <a href="tel:0558659948" className="text-[13px] text-gray-600 hover:text-black transition-colors">055 865 9948</a>
              <span className="text-[13px] text-gray-400">Mon – Sun, 8am – 9pm</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-gray-400">Good to know</span>
              <span className="text-[13px] text-gray-600 leading-relaxed">
                MTN delivery can take up to 24 hours.
              </span>
              <span className="text-[13px] text-gray-400">Payments secured by Paystack.</span>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200/70 flex flex-col sm:flex-row items-center justify-between gap-3">
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
