import { NextResponse } from 'next/server'
import { fetchXpresOffers } from '@/lib/vendor'
import { requireAdmin } from '@/lib/require-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Offer list from whichever vendor is currently configured. */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const data = await fetchXpresOffers()
    return NextResponse.json({ success: true, data })
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Request failed' })
  }
}
