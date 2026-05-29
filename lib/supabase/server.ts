import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server Supabase client — use in API route handlers and server components.
 * Reads the user session from cookies, so RLS policies apply correctly.
 * Never use this in client components — it imports next/headers which is server-only.
 */
export function createServerClient() {
  const cookieStore = cookies()

  return _createServerClient(
    process.env.next_public_supabase_url!,
    process.env.next_public_supabase_anon_key!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
