import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://www.xpresportal.app/api/v1/balance', {
      headers: {
        'Authorization': 'Bearer dk_llwYpusSIJLT7CpDBqQeUiLVQRymxTPO',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    const data = await res.json()
    const balance = data.balance ?? data.wallet_balance ?? data.data?.balance ?? 0
    return NextResponse.json({ success: true, balance: Number(balance), raw: data })
  } catch (e: any) {
    return NextResponse.json({ success: false, balance: 0, error: e.message })
  }
}
