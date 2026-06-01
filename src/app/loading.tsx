export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="h-14 bg-white border-b border-gray-100" />
      <div className="max-w-4xl mx-auto px-4 pt-10 pb-16">
        <div className="h-8 w-48 bg-gray-200 rounded-lg mx-auto mb-3 animate-pulse" />
        <div className="h-4 w-64 bg-gray-100 rounded mx-auto mb-10 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
              <div className="aspect-[4/3] bg-gray-100" />
              <div className="p-3.5">
                <div className="h-3.5 w-24 bg-gray-200 rounded mb-1.5" />
                <div className="h-3 w-16 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
