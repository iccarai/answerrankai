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
  process.env.next_public_supabase_url!,
  process.env.supabase_service_role_key!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
