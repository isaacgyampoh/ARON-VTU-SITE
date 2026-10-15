import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Makes one vendor the active one and stands the others down. */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await req.json().catch(() => ({ id: null }))
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const sb = createServiceClient()
  const { error: clearErr } = await sb.from('vendor_apis').update({ is_active: false }).eq('is_active', true)
  if (clearErr) return NextResponse.json({ error: clearErr.message }, { status: 400 })

  const { error } = await sb.from('vendor_apis').update({ is_active: true }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
