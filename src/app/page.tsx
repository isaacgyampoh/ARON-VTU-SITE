'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Network, DataPlan } from '@/lib/types'

const GHS = (n: number) => `GH₵ ${n.toFixed(2)}`
const DATA_CODES = ['mtn', 'telecel', 'at', 'mtninstant', 'airteltigo']
const STREAM_CODES = ['netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon']

const COLORS: Record<string, { bg: string; text: string }> = {
  mtn: { bg: '#ffcb05', text: '#003366' },
  mtninstant: { bg: '#ffcb05', text: '#003366' },
  telecel: { bg: '#e60000', text: '#fff' },
  at: { bg: '#003eb3', text: '#fff' },
  airteltigo: { bg: '#003eb3', text: '#fff' },
  netflix: { bg: '#e50914', text: '#fff' },
  applemusic: { bg: '#fa2d48', text: '#fff' },
  appletv: { bg: '#1a1a1a', text: '#fff' },
  applegames: { bg: '#0070c9', text: '#fff' },
  icloud: { bg: '#3693f5', text: '#fff' },
  amazon: { bg: '#00a8e1', text: '#fff' },
}

export default function Home() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [loading, setLoading] = useState(true)

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

  const dataNets = networks.filter(n => DATA_CODES.includes(n.code))
  const streamNets = networks.filter(n => STREAM_CODES.includes(n.code))

  function priceRange(id: string) {
    const p = plans.filter(x => x.network_id === id)
    if (!p.length) return null
    const min = Math.min(...p.map(x => x.selling_price))
    const max = Math.max(...p.map(x => x.selling_price))
    return min === max ? GHS(min) : `${GHS(min)} - ${GHS(max)}`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="h-14 px-4 flex items-center justify-between max-w-4xl mx-auto">
        <a href="/" className="flex items-center gap-1">
          <span className="text-base font-extrabold text-black tracking-tight">Chale</span>
          <span className="text-base font-extrabold text-blue-600 tracking-tight">Data</span>
        </a>
        <div className="flex items-center gap-5">
          <a href="/order" className="text-[13px] text-gray-500 hover:text-black transition">Track Order</a>
          <a href="https://wa.me/233533547740" target="_blank" className="text-[13px] text-gray-500 hover:text-black transition">Contact</a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pb-16">
        {/* Hero — simple, not flashy */}
        <div className="py-8 text-center">
          <h1 className="text-[28px] md:text-4xl font-extrabold text-black leading-tight">Buy Data & Streaming<br />Plans Instantly</h1>
          <p className="text-gray-400 text-sm mt-3 max-w-md mx-auto">Select a product below, enter your number, and pay with MoMo. Your data arrives in seconds.</p>
        </div>

        {/* Data Products */}
        {dataNets.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-black mb-4">Data Bundles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dataNets.map(n => {
                const c = COLORS[n.code] || COLORS.mtn
                const range = priceRange(n.id)
                const count = plans.filter(p => p.network_id === n.id).length
                return (
                  <a key={n.id} href={`/detail/${n.code}`}
                    className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition press">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0"
                      style={{ background: c.bg, color: c.text }}>
                      {n.name.substring(0, 3).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-black">{n.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{range || 'Coming soon'}{count > 0 ? ` · ${count} plans` : ''}</div>
                    </div>
                    <div className="text-sm font-bold text-blue-600">Buy Now →</div>
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {/* Streaming */}
        {streamNets.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-black mb-4">Streaming & Subscriptions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {streamNets.map(n => {
                const c = COLORS[n.code] || COLORS.netflix
                const range = priceRange(n.id)
                return (
                  <a key={n.id} href={`/detail/${n.code}`}
                    className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition press">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 leading-tight text-center"
                      style={{ background: c.bg, color: c.text }}>
                      {n.name.length > 6 ? n.name.substring(0, 5) : n.name}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-black">{n.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{range || 'Coming soon'}</div>
                    </div>
                    <div className="text-sm font-bold text-blue-600">Buy Now →</div>
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {dataNets.length === 0 && streamNets.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No products available yet.</div>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-100 pt-8 mt-12">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div>
              <div className="mb-1"><span className="font-extrabold text-black">Chale</span><span className="font-extrabold text-blue-600">Data</span></div>
              <p className="text-xs text-gray-400">For support: <a href="tel:0533547740" className="text-black font-medium">0533547740</a></p>
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
