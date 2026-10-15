'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!password || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not sign in')
        setBusy(false)
        return
      }
      const next = params.get('next')
      router.replace(next && next.startsWith('/admin') ? next : '/admin')
      router.refresh()
    } catch {
      setError('Network error. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-xs">
        <div className="text-center mb-6">
          <span className="text-lg font-extrabold text-black">Chale</span>
          <span className="text-lg font-extrabold text-blue-600">Data</span>
          <p className="text-xs text-gray-400 mt-1">Admin</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Password"
          autoFocus
          className="w-full h-11 px-4 border border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-black"
        />
        <button
          onClick={submit}
          disabled={busy || !password}
          className="w-full h-11 bg-black text-white rounded-lg text-sm font-semibold press disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Login'}
        </button>
        {error && <p className="text-xs text-red-600 mt-3 text-center">{error}</p>}
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginForm />
    </Suspense>
  )
}
