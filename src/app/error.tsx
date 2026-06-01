'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="text-center max-w-sm">
        <h2 className="text-lg font-black text-black mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-400 mb-6">{error.message || 'An unexpected error occurred.'}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={reset}
            className="h-10 px-5 bg-black text-white rounded-xl text-sm font-semibold press">
            Try Again
          </button>
          <a href="/" className="h-10 px-5 bg-gray-100 text-black rounded-xl text-sm font-semibold press flex items-center">
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
