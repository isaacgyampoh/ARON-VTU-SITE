import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://www.xpresportal.app/api/v1/offers', {
      headers: {
        'Accept': 'application/json',
        'x-api-key': 'dk_lUWtHYYDzJAlq-chnnvbdnmSwnSeSVx8',
        'Origin': 'https://chaledata.com',
        'Referer': 'https://chaledata.com/',
      },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json({ status: res.status, data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
