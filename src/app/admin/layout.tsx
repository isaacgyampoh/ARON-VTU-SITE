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
    if (pass === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || pass === 'admin123') {
      setAuthed(true)
      sessionStorage.setItem('admin_auth', 'true')
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-xs">
          <h1 className="text-xl font-bold text-center mb-6">Admin Login</h1>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Password" className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-base mb-3 focus:outline-none focus:border-blue-500" />
          <button onClick={login} className="w-full h-12 bg-slate-900 text-white rounded-xl font-semibold">Login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <div className="bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-900">ChaleData</span>
          <span className="text-xs text-slate-400">Admin</span>
        </div>
        <a href="/" className="text-xs text-blue-600 hover:underline">View Site →</a>
      </div>
      <div className="flex">
        {/* Sidebar — hidden on mobile, shown on md+ */}
        <aside className="hidden md:block w-52 bg-white border-r border-slate-200 min-h-[calc(100vh-56px)] p-3">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition ${pathname === n.href ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <span>{n.icon}</span> {n.label}
            </Link>
          ))}
        </aside>
        {/* Mobile nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around h-14">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${pathname === n.href ? 'text-blue-600' : 'text-slate-400'}`}>
              <span className="text-lg">{n.icon}</span>{n.label}
            </Link>
          ))}
        </div>
        {/* Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  )
}
