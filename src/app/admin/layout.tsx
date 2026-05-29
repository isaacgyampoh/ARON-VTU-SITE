'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Bundles', href: '/admin/bundles', icon: '📦' },
  { label: 'Vendors', href: '/admin/vendors', icon: '🔌' },
  { label: 'Orders', href: '/admin/orders', icon: '📋' },
  { label: 'Customers', href: '/admin/customers', icon: '👥' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_auth') === 'true') setAuthed(true)
  }, [])

  function login() {
    if (pass === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || pass === 'chaledata2026') {
      setAuthed(true)
      sessionStorage.setItem('admin_auth', 'true')
    }
  }

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-xs text-center fade-up">
        <div className="mb-6">
          <span className="text-xl font-extrabold text-slate-900">Chale</span>
          <span className="text-xl font-extrabold text-blue-600">Data</span>
          <div className="text-xs text-slate-400 mt-1">Admin Panel</div>
        </div>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Enter password"
          className="w-full h-12 px-4 border-2 border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 mb-3" />
        <button onClick={login} className="w-full h-12 bg-slate-900 text-white rounded-2xl font-semibold press hover:bg-slate-800 transition">Login</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-slate-900">Chale</span>
          <span className="font-extrabold text-blue-600">Data</span>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">Admin</span>
        </div>
        <a href="/" className="text-xs text-blue-600 font-semibold hover:text-blue-700">← View Site</a>
      </div>
      <div className="max-w-7xl mx-auto flex">
        <aside className="hidden md:block w-52 p-3 pt-4">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition ${pathname === n.href ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-100'}`}>
              <span>{n.icon}</span>{n.label}
            </Link>
          ))}
        </aside>
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around h-14 px-1">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={`flex flex-col items-center justify-center gap-0.5 text-[9px] font-medium min-w-0 ${pathname === n.href ? 'text-blue-600' : 'text-slate-400'}`}>
              <span className="text-base">{n.icon}</span>{n.label}
            </Link>
          ))}
        </div>
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  )
}
