/**
 * Talks to the admin API from the admin screens.
 *
 * These screens used to query Supabase directly with the public anon key. They
 * now go through /api/admin/*, which runs behind the admin session cookie, so
 * the data is only ever reachable by someone who has signed in.
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })

  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/admin/login'
    throw new Error('Session expired')
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Request failed')
  return body as T
}

/** Reads a collection. Returns an empty list rather than throwing on failure. */
export async function adminList<T>(path: string): Promise<T[]> {
  try {
    const body = await request<{ data: T[] }>(path)
    return body.data ?? []
  } catch (e) {
    console.error(`[admin] ${path} failed:`, e)
    return []
  }
}

export function adminGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function adminPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

/** For endpoints where PUT means "check this works", not "replace this". */
export function adminPut<T = unknown>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) })
}

export function adminPatch<T = unknown>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}

export function adminDelete(path: string, id: string): Promise<unknown> {
  return request(`${path}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}
