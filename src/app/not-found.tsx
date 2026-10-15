import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="text-center max-w-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-300 mb-2">404</p>
        <h1 className="text-lg font-black text-black mb-2">We couldn&apos;t find that page</h1>
        <p className="text-sm text-gray-400 mb-6">
          The bundle you were looking for may have been removed or is no longer on sale.
        </p>
        <div className="flex gap-2 justify-center">
          <Link href="/" className="h-10 px-5 bg-black text-white rounded-xl text-sm font-semibold press flex items-center">
            Browse bundles
          </Link>
          <Link href="/order" className="h-10 px-5 bg-gray-100 text-black rounded-xl text-sm font-semibold press flex items-center">
            Track an order
          </Link>
        </div>
      </div>
    </div>
  )
}
