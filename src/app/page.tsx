'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BRAND, NETWORK_LOGOS } from '@/lib/network-logos'
import type { Network, DataPlan } from '@/lib/types'

const GHS = (n: number) => `GH₵${n.toFixed(2)}`
const DATA_TYPES = ['mtn', 'mtninstant', 'mtnafa', 'telecel', 'at', 'airteltigo']
const STREAM_TYPES = ['netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon']

function NetworkLogo({ code, name, logoUrl, size }: {
  code: string; name: string; logoUrl?: string | null; size: number
}) {
  const logo = logoUrl || NETWORK_LOGOS[code]
  const b = BRAND[code] || { bg: '#e5e7eb', text: '#374151', short: code.slice(0, 3).toUpperCase() }
  const s = `w-${size} h-${size}`
  if (logo) return <img src={logo} alt={name} className={`${s} rounded-xl object-cover flex-shrink-0`} />
  return (
    <div className={`${s} rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0`}
      style={{ background: b.bg, color: b.text }}>
      {b.short}
    </div>
  )
}

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
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
    </div>
  )

  const activeNets = tab === 'data' ? dataNets : streamNets

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <span className="text-[17px] font-black text-black tracking-tight">Chale</span>
            <span className="text-[17px] font-black text-blue-600 tracking-tight">Data</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/order" className="text-[13px] text-gray-500 hover:text-black transition-colors">
              Track Order
            </a>
            <a href="https://wa.me/233533547740" target="_blank"
              className="h-8 px-3 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#25D366' }}>
              WhatsApp
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4">

        {/* ── Hero ── */}
        <div className="pt-12 pb-10 text-center">
          <h1 className="text-[32px] md:text-[44px] font-black text-black leading-[1.1] tracking-tight">
            Data &amp; Streaming<br />Delivered Fast
          </h1>
          <p className="text-[14px] text-gray-400 mt-4 max-w-xs mx-auto leading-relaxed">
            Buy MTN, Telecel, AirtelTigo data and streaming subscriptions — paid with MoMo in seconds.
          </p>
        </div>

        {/* ── Tab bar ── */}
        {dataNets.length > 0 && streamNets.length > 0 && (
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
            {(['data', 'streaming'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 h-9 rounded-lg text-[13px] font-semibold transition-all ${
                  tab === t ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t === 'data' ? 'Data Bundles' : 'Streaming'}
              </button>
            ))}
          </div>
        )}

        {/* ── Network cards ── */}
        {activeNets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pb-16">
            {activeNets.map(n => {
              const range = priceRange(n.id)
              const count = plans.filter(p => p.network_id === n.id).length
              return (
                <a key={n.id} href={`/detail/${n.code}`}
                  className="press flex items-center gap-3.5 p-4 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all">
                  <NetworkLogo code={n.code} name={n.name} logoUrl={n.logo_url} size={11} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-black leading-tight">{n.name}</div>
                    <div className="text-[12px] text-gray-400 mt-0.5 truncate">
                      {range || 'Coming soon'}
                      {count > 0 && <span className="text-gray-300 ml-1">· {count} plans</span>}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-300 flex-shrink-0">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              )
            })}
          </div>
        ) : (
          <p className="text-center text-gray-300 py-20 text-sm">No products available yet.</p>
        )}

      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8">

            {/* Brand */}
            <div>
              <div className="flex items-center mb-2">
                <span className="text-[15px] font-black text-black">Chale</span>
                <span className="text-[15px] font-black text-blue-600">Data</span>
              </div>
              <p className="text-[12px] text-gray-400 leading-relaxed max-w-[180px]">
                Fast data and streaming plans for Ghana. Powered by Paystack.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-12 text-[13px]">
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-300">Platform</span>
                <a href="/" className="text-gray-500 hover:text-black transition-colors">Home</a>
                <a href="/order" className="text-gray-500 hover:text-black transition-colors">Track Order</a>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-300">Support</span>
                <a href="https://wa.me/233533547740" target="_blank" className="text-gray-500 hover:text-black transition-colors">WhatsApp</a>
                <a href="tel:0533547740" className="text-gray-500 hover:text-black transition-colors">0533547740</a>
              </div>
            </div>

          </div>

          <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-[11px] text-gray-300">&copy; {new Date().getFullYear()} ChaleData. All rights reserved.</p>
            <p className="text-[11px] text-gray-300">Ghana · Mobile Money · Instant Delivery</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
