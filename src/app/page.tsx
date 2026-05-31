'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BRAND, NETWORK_LOGOS } from '@/lib/network-logos'
import type { Network, DataPlan } from '@/lib/types'

const GHS = (n: number) => `GH₵${n.toFixed(2)}`
const DATA_TYPES = ['mtn','mtninstant','telecel','at','airteltigo']
const STREAM_TYPES = ['netflix','applemusic','appletv','applegames','icloud','amazon']

function NetworkIcon({ code, name, logoUrl }: { code: string; name: string; logoUrl?: string | null }) {
  const logo = logoUrl || NETWORK_LOGOS[code]
  const b = BRAND[code] || { bg: '#111', text: '#fff', short: code.slice(0, 3).toUpperCase() }
  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 leading-none"
      style={{ background: b.bg, color: b.text }}
    >
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

  function planCount(id: string) {
    return plans.filter(x => x.network_id === id).length
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
    </div>
  )

  const activeNets = tab === 'data' ? dataNets : streamNets

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="h-14 px-4 flex items-center justify-between max-w-4xl mx-auto border-b border-gray-100">
        <a href="/" className="flex items-center gap-0.5">
          <span className="text-base font-extrabold text-black tracking-tight">Chale</span>
          <span className="text-base font-extrabold text-blue-600 tracking-tight">Data</span>
        </a>
        <div className="flex items-center gap-5">
          <a href="/order" className="text-[13px] text-gray-500 hover:text-black transition">Track Order</a>
          <a href="https://wa.me/233533547740" target="_blank"
            className="text-[13px] bg-[#25D366] text-white px-3 py-1.5 rounded-lg font-medium hover:opacity-90 transition">
            WhatsApp
          </a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pb-16">
        {/* Hero */}
        <div className="py-10 text-center">
          <h1 className="text-[30px] md:text-[42px] font-extrabold text-black leading-tight tracking-tight">
            Buy Data &amp; Streaming<br />Plans Instantly
          </h1>
          <p className="text-gray-400 text-sm mt-3 max-w-sm mx-auto leading-relaxed">
            MTN · Telecel · AirtelTigo · Netflix · Apple. Fast checkout, instant delivery.
          </p>
        </div>

        {/* Tab switcher */}
        {dataNets.length > 0 && streamNets.length > 0 && (
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit mx-auto">
            {(['data', 'streaming'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === t ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}>
                {t === 'data' ? 'Data Bundles' : 'Streaming'}
              </button>
            ))}
          </div>
        )}

        {/* Network Grid */}
        {activeNets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeNets.map(n => {
              const range = priceRange(n.id)
              const count = planCount(n.id)
              return (
                <a key={n.id} href={`/detail/${n.code}`}
                  className="flex items-center gap-4 border border-gray-200 rounded-2xl p-4 hover:border-gray-400 hover:shadow-sm transition-all press bg-white">
                  <NetworkIcon code={n.code} name={n.name} logoUrl={n.logo_url} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-black truncate">{n.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {range || 'Coming soon'}
                      {count > 0 && <span className="text-gray-300"> · {count} plans</span>}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-blue-600 whitespace-nowrap">Buy →</div>
                </a>
              )
            })}
          </div>
        ) : (
          <p className="text-center text-gray-300 py-16 text-sm">No products available yet.</p>
        )}

        {/* Why us */}
        <div className="mt-16 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: '⚡', label: 'Instant', sub: 'Data sent in seconds' },
            { icon: '🔒', label: 'Secure', sub: 'Powered by Paystack' },
            { icon: '📞', label: 'Support', sub: 'WhatsApp anytime' },
          ].map(x => (
            <div key={x.label} className="py-6 px-3 rounded-2xl bg-gray-50">
              <div className="text-2xl mb-1">{x.icon}</div>
              <div className="text-sm font-bold text-black">{x.label}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{x.sub}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-100 pt-8 mt-12">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div>
              <div className="mb-1">
                <span className="font-extrabold text-black">Chale</span>
                <span className="font-extrabold text-blue-600">Data</span>
              </div>
              <p className="text-xs text-gray-400">Support: <a href="tel:0533547740" className="text-black font-medium">0533547740</a></p>
            </div>
            <div className="flex gap-6 text-xs text-gray-400">
              <a href="/" className="hover:text-black transition">Home</a>
              <a href="/order" className="hover:text-black transition">Track Order</a>
              <a href="https://wa.me/233533547740" target="_blank" className="hover:text-black transition">WhatsApp</a>
            </div>
          </div>
          <p className="text-[10px] text-gray-300 mt-6">&copy; {new Date().getFullYear()} ChaleData. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}
