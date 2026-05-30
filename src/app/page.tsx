'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Network, DataPlan } from '@/lib/types'

const GHS = (n: number) => `GH₵ ${n.toFixed(2)}`

const DATA_CODES = ['mtn', 'telecel', 'at']
const STREAMING_CODES = ['netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon']

const NET_STYLE: Record<string, { icon: string; gradient: string }> = {
  mtn: { icon: '🟡', gradient: 'from-[#ffcb05] to-[#e6b800]' },
  telecel: { icon: '🔴', gradient: 'from-[#e60000] to-[#cc0000]' },
  at: { icon: '🔵', gradient: 'from-[#003eb3] to-[#002d80]' },
  netflix: { icon: '🎬', gradient: 'from-[#e50914] to-[#b20710]' },
  applemusic: { icon: '🎵', gradient: 'from-[#fa2d48] to-[#a834eb]' },
  appletv: { icon: '📺', gradient: 'from-[#2d2d2d] to-[#1a1a1a]' },
  applegames: { icon: '🎮', gradient: 'from-[#0070c9] to-[#00549e]' },
  icloud: { icon: '☁️', gradient: 'from-[#3693f5] to-[#2176d6]' },
  amazon: { icon: '📦', gradient: 'from-[#00a8e1] to-[#0077b5]' },
}

export default function Home() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { data: nets, error: nErr } = await supabase.from('networks').select('*').eq('is_active', true).order('name')
        if (nErr) { setError(nErr.message); setLoading(false); return }
        
        const { data: pls, error: pErr } = await supabase.from('data_plans').select('*').eq('is_active', true).order('selling_price')
        if (pErr) { setError(pErr.message); setLoading(false); return }
        
        setNetworks(nets || [])
        setPlans(pls || [])
      } catch (e: any) {
        setError(e.message)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Determine type by code — works even without 'type' column
  const dataNetworks = networks.filter(n => DATA_CODES.includes(n.code))
  const streamingNetworks = networks.filter(n => STREAMING_CODES.includes(n.code))

  function getPriceRange(networkId: string) {
    const netPlans = plans.filter(p => p.network_id === networkId)
    if (netPlans.length === 0) return null
    const min = Math.min(...netPlans.map(p => p.selling_price))
    const max = Math.max(...netPlans.map(p => p.selling_price))
    return min === max ? GHS(min) : `${GHS(min)} - ${GHS(max)}`
  }

  function getPlanCount(networkId: string) {
    return plans.filter(p => p.network_id === networkId).length
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center fade-up">
        <div className="mb-3"><span className="text-xl font-extrabold text-slate-900">Chale</span><span className="text-xl font-extrabold text-blue-600">Data</span></div>
        <div className="w-7 h-7 border-[2.5px] border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="px-4 h-16 flex items-center justify-between max-w-3xl mx-auto">
        <div><span className="text-lg font-extrabold text-slate-900">Chale</span><span className="text-lg font-extrabold text-blue-600">Data</span></div>
        <a href="/order" className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition">Track Order</a>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 mx-4 rounded-3xl p-6 pb-7 mb-8 max-w-3xl sm:mx-auto relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #60a5fa 0%, transparent 40%)' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur px-3 py-1 rounded-full mb-4">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Instant Delivery</span>
          </div>
          <h1 className="text-white text-[22px] font-extrabold leading-tight mb-2">Buy Data &<br />Streaming Instantly.</h1>
          <p className="text-blue-200/60 text-xs leading-relaxed">MTN · Telecel · AirtelTigo · Netflix · Apple & more<br />No signup. No wallet. Just pay and go.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-20">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700">
            Error loading products: {error}
          </div>
        )}

        {/* Data Products */}
        {dataNetworks.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-blue-600 rounded-full" />
              <h2 className="text-base font-extrabold text-slate-900">Data Bundles</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {dataNetworks.map(n => {
                const s = NET_STYLE[n.code] || NET_STYLE.mtn
                const range = getPriceRange(n.id)
                const count = getPlanCount(n.id)
                return (
                  <a key={n.code} href={`/detail/${n.code}`}
                    className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 press group">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-2xl shadow-sm flex-shrink-0`}>
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">{n.name}</div>
                      {range ? (
                        <div className="text-xs text-slate-400 mt-0.5">{range}</div>
                      ) : (
                        <div className="text-xs text-slate-300 mt-0.5">Coming soon</div>
                      )}
                      {count > 0 && <div className="text-[10px] text-slate-300 mt-0.5">{count} plans</div>}
                    </div>
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 group-hover:stroke-blue-500 transition"><path d="M9 18l6-6-6-6"/></svg>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Streaming Products */}
        {streamingNetworks.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-purple-500 rounded-full" />
              <h2 className="text-base font-extrabold text-slate-900">Streaming & Subscriptions</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {streamingNetworks.map(n => {
                const s = NET_STYLE[n.code] || NET_STYLE.netflix
                const range = getPriceRange(n.id)
                const count = getPlanCount(n.id)
                return (
                  <a key={n.code} href={`/detail/${n.code}`}
                    className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 press group">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-2xl shadow-sm flex-shrink-0`}>
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition">{n.name}</div>
                      {range ? (
                        <div className="text-xs text-slate-400 mt-0.5">{range}</div>
                      ) : (
                        <div className="text-xs text-slate-300 mt-0.5">Coming soon</div>
                      )}
                      {count > 0 && <div className="text-[10px] text-slate-300 mt-0.5">{count} plans</div>}
                    </div>
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 group-hover:stroke-purple-500 transition"><path d="M9 18l6-6-6-6"/></svg>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* No products */}
        {dataNetworks.length === 0 && streamingNetworks.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📡</div>
            <p className="text-sm text-slate-500 mb-1">No products available yet.</p>
            <p className="text-xs text-slate-400">Add products in the <a href="/admin" className="text-blue-600 font-semibold hover:underline">admin panel</a>.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="mb-1"><span className="text-sm font-extrabold text-slate-900">Chale</span><span className="text-sm font-extrabold text-blue-600">Data</span></div>
              <p className="text-[11px] text-slate-400">Affordable data & streaming. Instant delivery.</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <a href="/order" className="hover:text-blue-600 transition">Track Order</a>
              <a href="https://wa.me/233533547740" target="_blank" className="hover:text-emerald-600 transition">WhatsApp</a>
            </div>
          </div>
          <p className="text-[10px] text-slate-300 mt-4">&copy; {new Date().getFullYear()} ChaleData. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
