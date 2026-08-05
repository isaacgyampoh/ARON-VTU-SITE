import { NextResponse } from 'next/server'
import { fetchXpresOffers } from '@/lib/vendor'

export const runtime = 'nodejs'

/** Offer list from whichever vendor is currently configured. */
export async function GET() {
  try {
    const data = await fetchXpresOffers()
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message })
  }
}
