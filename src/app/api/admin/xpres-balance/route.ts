import { NextResponse } from 'next/server'
import { checkXpresBalance } from '@/lib/vendor'

export const runtime = 'nodejs'

/** Wallet balance from whichever vendor is currently configured. */
export async function GET() {
  const r = await checkXpresBalance()
  return NextResponse.json({ success: r.success, balance: r.balance, raw: r.raw })
}
