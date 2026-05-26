import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client using the service role key — BYPASSES RLS.
 *
 * Use ONLY in:
 *   - Stripe webhook handlers (no user session available)
 *   - Vercel Cron jobs
 *
 * Never import this in client components or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 * Always set user_id explicitly on every insert — RLS won't enforce it here.
 */
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
