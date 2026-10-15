'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Networks', href: '/admin/networks' },
  { label: 'Bundles', href: '/admin/bundles' },
  { label: 'Vendors', href: '/admin/vendors' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Customers', href: '/admin/customers' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Access is decided on the server (see src/proxy.ts). Anyone rendering this
  // layout has already been let through, so there is no password check here.
  if (pathname === '/admin/login') return <>{children}</>

  async function signOut() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="max-w-6xl mx-auto h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-black text-sm">Chale</span>
            <span className="font-extrabold text-blue-600 text-sm">Data</span>
            <span className="text-[10px] text-gray-400 font-medium">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-gray-400 hover:text-black transition">View Site →</Link>
            <button onClick={signOut} className="text-xs text-gray-400 hover:text-black transition">Sign out</button>
          </div>
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
