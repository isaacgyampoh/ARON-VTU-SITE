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
            <a href="https://wa.me/233558659948" target="_blank"
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: '#25D366' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12.001 2C6.478 2 2 6.478 2 12c0 1.846.502 3.574 1.37 5.063L2 22l5.09-1.33A9.956 9.956 0 0012.001 22C17.523 22 22 17.522 22 12S17.523 2 12.001 2zm0 1.8A8.2 8.2 0 0120.2 12a8.2 8.2 0 01-8.199 8.2 8.167 8.167 0 01-4.17-1.14l-.299-.18-3.1.81.828-3.02-.196-.31A8.164 8.164 0 013.8 12 8.2 8.2 0 0112.001 3.8zm-2.425 4.4c-.198 0-.52.074-.793.37-.272.296-1.04 1.016-1.04 2.479s1.064 2.876 1.213 3.074c.149.198 2.051 3.274 5.063 4.461.708.271 1.26.433 1.69.555.71.2 1.357.172 1.868.104.57-.076 1.754-.717 2.002-1.41.247-.692.247-1.285.173-1.41-.074-.123-.272-.197-.57-.346-.298-.149-1.755-.866-2.027-.966-.272-.099-.47-.148-.669.149-.198.297-.768.966-.942 1.164-.173.198-.347.223-.644.074-.298-.148-1.258-.464-2.397-1.48-.886-.79-1.485-1.766-1.659-2.063-.173-.298-.018-.459.13-.607.134-.134.298-.347.447-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.074-.149-.669-1.613-.916-2.208-.24-.578-.486-.5-.669-.51a12.17 12.17 0 00-.572-.01z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pb-16">

        {/* ── Hero ── */}
        <div className="pt-10 pb-8 text-center">
          <h1 className="text-[28px] md:text-[38px] font-black text-black leading-tight tracking-tight">
            Data &amp; Streaming,<br />Delivered Instantly
          </h1>
          <p className="text-[14px] text-gray-400 mt-3 max-w-xs mx-auto">
            Pay with MoMo. Data arrives in seconds.
          </p>
        </div>

        {/* ── Tab switcher ── */}
        {dataNets.length > 0 && streamNets.length > 0 && (
          <div className="flex gap-1 p-1 bg-white rounded-2xl w-fit mx-auto mb-8 shadow-sm">
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
        {activeNets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {activeNets.map(n => {
              const logo = n.logo_url || NETWORK_LOGOS[n.code]
              const b = BRAND[n.code] || { bg: '#e5e7eb', text: '#111', short: n.code.slice(0,3).toUpperCase() }
              const range = priceRange(n.id)
              const count = plans.filter(p => p.network_id === n.id).length

              return (
                <a key={n.id} href={`/detail/${n.code}`}
                  className="press group relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col">

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
                        {count} plans
                      </div>
                    )}
                  </div>

                  {/* Card footer */}
                  <div className="px-3.5 py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-black truncate">{n.name}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {range || 'Coming soon'}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2 w-7 h-7 rounded-full bg-black flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
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
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div>
              <div className="flex items-center mb-2">
                <span className="text-[15px] font-black text-black">Chale</span>
                <span className="text-[15px] font-black text-blue-600">Data</span>
              </div>
              <p className="text-[12px] text-gray-400 leading-relaxed max-w-[180px]">
                Fast data &amp; streaming for Ghana. Powered by Paystack.
              </p>
            </div>
            <div className="flex gap-12 text-[13px]">
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-300">Platform</span>
                <a href="/" className="text-gray-500 hover:text-black transition-colors">Home</a>
                <a href="/order" className="text-gray-500 hover:text-black transition-colors">Track Order</a>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-300">Support</span>
                <a href="https://wa.me/233558659948" target="_blank" className="text-gray-500 hover:text-black transition-colors">WhatsApp</a>
                <a href="tel:0558659948" className="text-gray-500 hover:text-black transition-colors">0558659948</a>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-300 mt-8">&copy; {new Date().getFullYear()} ChaleData. All rights reserved.</p>
        </footer>

      </div>
    </div>
  )
}
