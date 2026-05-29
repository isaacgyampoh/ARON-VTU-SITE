'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Network, DataPlan } from '@/lib/types'

export default function Home() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState<string>('')
  const [phone, setPhone] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [result, setResult] = useState<{ success: boolean; orderNo?: string; error?: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: nets }, { data: pls }] = await Promise.all([
      supabase.from('networks').select('*').eq('is_active', true).order('name'),
      supabase.from('data_plans').select('*').eq('is_active', true).order('sort_order').order('selling_price'),
    ])
    setNetworks(nets || [])
    setPlans(pls || [])
    setLoading(false)
  }

  const filteredPlans = plans.filter(p => {
    const net = networks.find(n => n.id === p.network_id)
    return net?.code === selectedNetwork
  })

  const networkColors: Record<string, string> = {
    mtn: 'bg-yellow-400 text-yellow-900 border-yellow-400',
    telecel: 'bg-red-500 text-white border-red-500',
    at: 'bg-blue-500 text-white border-blue-500',
  }

  const networkBg: Record<string, string> = {
    mtn: 'border-yellow-300 bg-yellow-50',
    telecel: 'border-red-300 bg-red-50',
    at: 'border-blue-300 bg-blue-50',
  }

  async function handlePay() {
    if (!selectedPlan || !phone.trim()) return
    setPaying(true)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          network: selectedNetwork,
          planId: selectedPlan.id,
        }),
      })
      const data = await res.json()
      if (!data.success) { setPaying(false); setResult({ success: false, error: data.error }); return }

      // Open Paystack
      const handler = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: data.paystack.email,
        amount: data.paystack.amount,
        currency: data.paystack.currency,
        ref: data.paystack.reference,
        channels: ['mobile_money'],
        callback: () => {
          setResult({ success: true, orderNo: data.order.order_no })
          setPaying(false)
        },
        onClose: () => {
          setPaying(false)
        },
      })
      handler.openIframe()
    } catch (e: any) {
      setPaying(false)
      setResult({ success: false, error: e.message })
    }
  }

  // Success/error screen
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center fade-in">
          {result.success ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
              <p className="text-slate-500 mb-1">Your data is being delivered now.</p>
              <p className="text-sm text-slate-400 mb-6">Order: {result.orderNo}</p>
              <div className="bg-slate-100 rounded-xl p-4 mb-6 text-left">
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Phone</span><span className="font-medium">{phone}</span></div>
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Network</span><span className="font-medium uppercase">{selectedNetwork}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Bundle</span><span className="font-medium">{selectedPlan?.data_amount}</span></div>
              </div>
              <button onClick={() => { setResult(null); setSelectedPlan(null); setPhone('') }} className="w-full h-12 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition">Buy Again</button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Failed</h1>
              <p className="text-slate-500 mb-6">{result.error || 'Something went wrong. Please try again.'}</p>
              <button onClick={() => setResult(null)} className="w-full h-12 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition">Try Again</button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <script src="https://js.paystack.co/v2/inline.js" />
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">ARON VTU</h1>
          <p className="text-sm text-slate-500 mt-1">Buy data instantly. No signup needed.</p>
        </div>

        {/* Step 1: Network */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">1. Select Network</label>
          <div className="grid grid-cols-3 gap-3">
            {networks.map(n => (
              <button
                key={n.code}
                onClick={() => { setSelectedNetwork(n.code); setSelectedPlan(null) }}
                className={`h-14 rounded-xl font-bold text-sm border-2 transition-all duration-200 ${
                  selectedNetwork === n.code
                    ? networkColors[n.code] + ' shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {n.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Phone */}
        {selectedNetwork && (
          <div className="mb-6 fade-in">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">2. Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="024 XXX XXXX"
              className={`w-full h-12 px-4 rounded-xl text-base font-medium border-2 focus:outline-none transition ${
                selectedNetwork && networkBg[selectedNetwork]
                  ? networkBg[selectedNetwork]
                  : 'border-slate-200 bg-white'
              } focus:border-blue-500`}
            />
          </div>
        )}

        {/* Step 3: Bundles */}
        {selectedNetwork && phone.length >= 9 && (
          <div className="mb-6 fade-in">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">3. Choose Bundle</label>
            <div className="grid grid-cols-2 gap-2">
              {filteredPlans.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p)}
                  className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                    selectedPlan?.id === p.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-lg font-bold text-slate-900">{p.data_amount}</div>
                  <div className="text-xs text-slate-400">{p.validity}</div>
                  <div className="text-sm font-bold text-blue-600 mt-1">GHS {p.selling_price.toFixed(2)}</div>
                </button>
              ))}
            </div>
            {filteredPlans.length === 0 && (
              <p className="text-center text-slate-400 py-8">No bundles available for this network.</p>
            )}
          </div>
        )}

        {/* Step 4: Pay */}
        {selectedPlan && phone.length >= 9 && (
          <div className="fade-in">
            <div className="bg-slate-900 text-white rounded-xl p-4 mb-4 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-400">Total</div>
                <div className="text-xl font-bold">GHS {selectedPlan.selling_price.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">{selectedPlan.data_amount}</div>
                <div className="text-sm font-medium">{phone}</div>
              </div>
            </div>
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full h-14 bg-blue-600 text-white rounded-xl text-base font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {paying ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
              ) : (
                <>Pay GHS {selectedPlan.selling_price.toFixed(2)}</>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-3">Secured by Paystack · Instant delivery</p>
          </div>
        )}

        {/* Track order link */}
        <div className="text-center mt-10 pt-6 border-t border-slate-200">
          <a href="/order" className="text-sm text-blue-600 font-medium hover:underline">Track an existing order →</a>
        </div>
      </div>
    </>
  )
}
