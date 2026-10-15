import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Server-side Supabase client using the service role key.
 *
 * There is deliberately no browser client any more. Row level security now
 * shuts the anon key out of orders, customers and vendor settings, so every
 * read goes through a route handler on the server where it can be checked.
 *
 * Created lazily: building the app must not require a live database.
 */
let client: SupabaseClient | null = null

export function createServiceClient(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
