import { NextResponse } from 'next/server'
import { createServiceClient } from './supabase'
import { requireAdmin } from './require-admin'

/**
 * CRUD over one table for the admin, behind the admin session.
 *
 * These exist because row level security no longer lets the public anon key
 * touch this data. The admin screens used to query Supabase straight from the
 * browser with that key, which meant anyone could read the same rows.
 *
 * `columns` is an allowlist: a request cannot write a field that is not on it.
 */
export type ResourceConfig = {
  table: string
  columns: readonly string[]
  select?: string
  order?: { column: string; ascending?: boolean }[]
  limit?: number
}

function pick(body: Record<string, unknown>, columns: readonly string[]) {
  const out: Record<string, unknown> = {}
  for (const c of columns) {
    if (Object.prototype.hasOwnProperty.call(body, c)) out[c] = body[c]
  }
  return out
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function createResourceRoutes(config: ResourceConfig) {
  const { table, columns, select = '*', order = [], limit = 500 } = config

  async function guard() {
    return requireAdmin()
  }

  return {
    async GET() {
      const denied = await guard()
      if (denied) return denied

      const sb = createServiceClient()
      let query = sb.from(table).select(select).limit(limit)
      for (const o of order) query = query.order(o.column, { ascending: o.ascending ?? true })

      const { data, error } = await query
      if (error) {
        console.error(`[admin/${table}] read failed:`, error)
        return fail('Could not load this data.', 500)
      }
      return NextResponse.json({ data: data ?? [] })
    },

    async POST(req: Request) {
      const denied = await guard()
      if (denied) return denied

      const body = await req.json().catch(() => null)
      if (!body || typeof body !== 'object') return fail('Invalid request body')

      const values = pick(body as Record<string, unknown>, columns)
      if (!Object.keys(values).length) return fail('Nothing to save')

      const sb = createServiceClient()
      const { data, error } = await sb.from(table).insert(values).select(select).single()
      if (error) {
        console.error(`[admin/${table}] insert failed:`, error)
        return fail(error.message, 400)
      }
      return NextResponse.json({ data })
    },

    async PATCH(req: Request) {
      const denied = await guard()
      if (denied) return denied

      const body = await req.json().catch(() => null)
      if (!body || typeof body !== 'object') return fail('Invalid request body')

      const { id, ...rest } = body as Record<string, unknown>
      if (typeof id !== 'string' || !id) return fail('id is required')

      const values = pick(rest, columns)
      if (!Object.keys(values).length) return fail('Nothing to update')

      const sb = createServiceClient()
      const { data, error } = await sb.from(table).update(values).eq('id', id).select(select).single()
      if (error) {
        console.error(`[admin/${table}] update failed:`, error)
        return fail(error.message, 400)
      }
      return NextResponse.json({ data })
    },

    async DELETE(req: Request) {
      const denied = await guard()
      if (denied) return denied

      const id = new URL(req.url).searchParams.get('id')
      if (!id) return fail('id is required')

      const sb = createServiceClient()
      const { error } = await sb.from(table).delete().eq('id', id)
      if (error) {
        console.error(`[admin/${table}] delete failed:`, error)
        return fail(error.message, 400)
      }
      return NextResponse.json({ success: true })
    },
  }
}
