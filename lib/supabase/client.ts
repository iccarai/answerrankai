'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser Supabase client — use in client components and Zustand store.
 * Respects RLS using the logged-in user's session cookie.
 */
export function createClient() {
  return createBrowserClient(
    process.env.next_public_supabase_url!,
    process.env.next_public_supabase_anon_key!
  )
}
