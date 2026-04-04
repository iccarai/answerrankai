---
name: supabase-patterns
description: Supabase patterns for Next.js — server vs browser client, RLS policies, auth helpers, and safe patterns for API routes and server components.
origin: AnswerRank AI / ICC
---

# Supabase Patterns for Next.js 14

## Two Clients — Always Use the Right One

```typescript
// lib/supabase/client.ts — Browser (client components, store)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts — Server (API routes, server components)
import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerClient() {
  const cookieStore = cookies()
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
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

// lib/supabase/admin.ts — Service role (webhooks, cron — bypasses RLS)
import { createClient } from '@supabase/supabase-js'

export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NEVER expose this to browser
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

**Rule:** 
- Browser client → client components and Zustand store
- Server client → API route handlers and server components (respects RLS)
- Admin client → Stripe webhooks and cron jobs only (bypasses RLS — use carefully)

## Row Level Security (RLS)

Always enable RLS. Every table needs a policy or no one can read it.

```sql
-- Enable RLS on all tables
alter table businesses enable row level security;
alter table scans enable row level security;
alter table reports enable row level security;
alter table fix_items enable row level security;
alter table subscriptions enable row level security;

-- Standard "users own their data" policy
create policy "users_own_businesses"
  on businesses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Reports readable if user owns the scan
create policy "users_own_reports"
  on reports for all
  using (auth.uid() = user_id);

-- Fix items readable if user owns the report
create policy "users_own_fix_items"
  on fix_items for select
  using (
    exists (
      select 1 from reports
      where reports.id = fix_items.report_id
      and reports.user_id = auth.uid()
    )
  );
```

## Auth in API Routes

```typescript
// Always verify auth before touching data
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // RLS automatically filters to this user's data
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('scan_id', scanId)
    .single()
}
```

## Inserting Data in Webhooks (Admin Client)

Stripe webhooks run without user session. Use admin client but always set user_id explicitly:

```typescript
// In stripe webhook handler
import { adminClient } from '@/lib/supabase/admin'

await adminClient.from('scans').insert({
  id: scanId,
  user_id: userId,  // always set this explicitly
  business_id: businessId,
  status: 'pending',
  stripe_session_id: session.id,
  tier: 'one_time'
})
```

## Querying Patterns

```typescript
// Single record
const { data, error } = await supabase
  .from('reports')
  .select('*, fix_items(*)')  // join
  .eq('scan_id', scanId)
  .single()

// List with filter
const { data } = await supabase
  .from('scans')
  .select('*')
  .eq('user_id', user.id)
  .order('triggered_at', { ascending: false })
  .limit(10)

// Update
await supabase
  .from('scans')
  .update({ status: 'complete', completed_at: new Date().toISOString() })
  .eq('id', scanId)
```

## Error Handling

```typescript
const { data, error } = await supabase.from('reports').select('*').single()

if (error) {
  if (error.code === 'PGRST116') {
    // No rows returned — not found
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  console.error('Supabase error:', error)
  return NextResponse.json({ error: 'Database error' }, { status: 500 })
}
```

## Realtime (Scan Progress Updates)

```typescript
// In client component — subscribe to scan status changes
'use client'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

useEffect(() => {
  const channel = supabase
    .channel('scan-status')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'scans',
      filter: `id=eq.${scanId}`
    }, (payload) => {
      setScanStatus(payload.new.status)
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [scanId])
```

This is how the progress UI updates without polling.

## TypeScript Types from Schema

Generate types after schema is finalized:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

Then use:
```typescript
import type { Database } from '@/types/supabase'
type Report = Database['public']['Tables']['reports']['Row']
```

## Common Gotchas

- Never use service role key in client-side code — it bypasses all RLS
- `createServerClient()` requires the `@supabase/ssr` package, not `@supabase/supabase-js` directly
- RLS policies must cover all operations (select, insert, update, delete) separately
- If a table has RLS enabled but no policy, **all access is denied** — even to the owner
- Realtime requires the table to have replication enabled in Supabase dashboard
