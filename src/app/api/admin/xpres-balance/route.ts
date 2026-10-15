import { NextResponse } from 'next/server'
import { checkXpresBalance } from '@/lib/vendor'
import { requireAdmin } from '@/lib/require-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Wallet balance from whichever vendor is currently configured. */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const r = await checkXpresBalance()
  return NextResponse.json({
    success: r.success,
    balance: r.balance,
    error: r.success ? undefined : 'Could not reach the vendor.',
  })
}
