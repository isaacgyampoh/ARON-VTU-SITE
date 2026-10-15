'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The message can carry internals — log it, don't print it on the page.
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="text-center max-w-sm">
        <h2 className="text-lg font-black text-black mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-400 mb-6">
          Please try again. If it keeps happening,{' '}
          <a href="https://wa.me/233558659948" target="_blank" rel="noopener noreferrer"
            className="text-black font-medium underline underline-offset-2">
            message us on WhatsApp
          </a>.
        </p>
        <div className="flex gap-2 justify-center">
          <button onClick={reset}
            className="h-10 px-5 bg-black text-white rounded-xl text-sm font-semibold press">
            Try Again
          </button>
          <Link href="/" className="h-10 px-5 bg-gray-100 text-black rounded-xl text-sm font-semibold press flex items-center">
            Go Home
          </Link>
        </div>
        {error.digest && (
          <p className="text-[10px] text-gray-300 font-mono mt-6">Reference: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
