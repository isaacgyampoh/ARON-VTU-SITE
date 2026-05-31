'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Bundles', href: '/admin/bundles' },
  { label: 'Vendors', href: '/admin/vendors' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Customers', href: '/admin/customers' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_auth') === 'true') setAuthed(true)
  }, [])

  function login() {
    if (pass === 'chaledata2026') {
      setAuthed(true)
      sessionStorage.setItem('admin_auth', 'true')
    }
  }

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-6">
          <span className="text-lg font-extrabold text-black">Chale</span>
          <span className="text-lg font-extrabold text-blue-600">Data</span>
          <p className="text-xs text-gray-400 mt-1">Admin</p>
        </div>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Password"
          className="w-full h-11 px-4 border border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-black" />
        <button onClick={login} className="w-full h-11 bg-black text-white rounded-lg text-sm font-semibold press">Login</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="max-w-6xl mx-auto h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-black text-sm">Chale</span>
            <span className="font-extrabold text-blue-600 text-sm">Data</span>
            <span className="text-[10px] text-gray-400 font-medium">Admin</span>
          </div>
          <a href="/" className="text-xs text-gray-400 hover:text-black transition">View Site →</a>
        </div>
      </div>
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="max-w-6xl mx-auto flex gap-1 -mb-px">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${pathname === n.href ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {n.label}
            </Link>
          ))}
        </div>
      </div>
      <main className="max-w-6xl mx-auto p-4">{children}</main>
    </div>
  )
}
