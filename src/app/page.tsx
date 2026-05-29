'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Network, DataPlan } from '@/lib/types'

const GHS = (n: number) => `GH₵ ${n.toFixed(2)}`

const NET_STYLE: Record<string, { bg: string; text: string; icon: string; gradient: string }> = {
  mtn: { bg: 'bg-[#ffcb05]', text: 'text-[#003366]', icon: '🟡', gradient: 'from-[#ffcb05] to-[#e6b800]' },
  telecel: { bg: 'bg-[#e60000]', text: 'text-white', icon: '🔴', gradient: 'from-[#e60000] to-[#cc0000]' },
  at: { bg: 'bg-[#003eb3]', text: 'text-white', icon: '🔵', gradient: 'from-[#003eb3] to-[#002d80]' },
  netflix: { bg: 'bg-[#e50914]', text: 'text-white', icon: '🎬', gradient: 'from-[#e50914] to-[#b20710]' },
  applemusic: { bg: 'bg-[#fa2d48]', text: 'text-white', icon: '🎵', gradient: 'from-[#fa2d48] to-[#a834eb]' },
  appletv: { bg: 'bg-[#2d2d2d]', text: 'text-white', icon: '📺', gradient: 'from-[#2d2d2d] to-[#1a1a1a]' },
  applegames: { bg: 'bg-[#0070c9]', text: 'text-white', icon: '🎮', gradient: 'from-[#0070c9] to-[#00549e]' },
  icloud: { bg: 'bg-[#3693f5]', text: 'text-white', icon: '☁️', gradient: 'from-[#3693f5] to-[#2176d6]' },
  amazon: { bg: 'bg-[#00a8e1]', text: 'text-white', icon: '📦', gradient: 'from-[#00a8e1] to-[#0077b5]' },
}

export default function Home() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('networks').select('*').eq('is_active', true).order('name'),
      supabase.from('data_plans').select('*, networks(name, code, type)').eq('is_active', true).order('selling_price'),
    ]).then(([{ data: n }, { data: p }]) => {
      setNetworks(n || [])
      setPlans(p || [])
      setLoading(false)
    })
  }, [])

  const dataNetworks = networks.filter(n => n.type === 'data')
  const streamingNetworks = networks.filter(n => n.type === 'streaming')

  function getPriceRange(networkId: string) {
    const netPlans = plans.filter(p => p.network_id === networkId)
    if (netPlans.length === 0) return null
    const min = Math.min(...netPlans.map(p => p.selling_price))
    const max = Math.max(...netPlans.map(p => p.selling_price))
    return min === max ? GHS(min) : `${GHS(min)} - ${GHS(max)}`
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
        <div className="flex items-center gap-4">
          <a href="/order" className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition">Track Order</a>
        </div>
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
                return (
                  <a key={n.code} href={`/detail/${n.code}`}
                    className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 press group">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-2xl shadow-sm flex-shrink-0`}>
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">{n.name}</div>
                      {range && <div className="text-xs text-slate-400 mt-0.5">{range}</div>}
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
                return (
                  <a key={n.code} href={`/detail/${n.code}`}
                    className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 press group">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-2xl shadow-sm flex-shrink-0`}>
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition">{n.name}</div>
                      {range && <div className="text-xs text-slate-400 mt-0.5">{range}</div>}
                    </div>
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 group-hover:stroke-purple-500 transition"><path d="M9 18l6-6-6-6"/></svg>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* No products */}
        {dataNetworks.length === 0 && streamingNetworks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📡</div>
            <p className="text-sm text-slate-500 mb-1">No products available yet.</p>
            <p className="text-xs text-slate-400">Check back soon!</p>
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
              <a href="/admin" className="hover:text-slate-600 transition">Admin</a>
            </div>
          </div>
          <p className="text-[10px] text-slate-300 mt-4">&copy; {new Date().getFullYear()} ChaleData. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
