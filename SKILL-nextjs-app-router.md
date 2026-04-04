---
name: nextjs-app-router
description: Next.js 14 App Router patterns — route handlers, server components, middleware, auth cookies, and API route conventions for production Next.js apps.
origin: AnswerRank AI / ICC
---

# Next.js 14 App Router Patterns

## Route Handlers (API Routes)

All API routes live in `app/api/`. Use `route.ts`, not `pages/api/`.

```typescript
// app/api/scan/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // logic here
    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  // ...
}
```

## Dynamic Route Segments

```typescript
// app/api/report/[scanId]/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: { scanId: string } }
) {
  const { scanId } = params
  // ...
}
```

## Server Components vs Client Components

```typescript
// Server Component (default) — runs on server, can use async/await
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const data = await fetchFromDB() // direct DB access fine
  return <div>{data}</div>
}

// Client Component — add 'use client' directive
// components/ScanProgress.tsx
'use client'
import { useState, useEffect } from 'react'
export default function ScanProgress() { ... }
```

**Rule:** Server components for data fetching and layout. Client components for interactivity, state, and browser APIs.

## Auth in Route Handlers (with Supabase)

```typescript
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // proceed
}
```

## Middleware (Auth Guard)

```typescript
// middleware.ts (root of project)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')
  const protectedPaths = ['/dashboard', '/results']
  
  if (protectedPaths.some(p => req.nextUrl.pathname.startsWith(p)) && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/results/:path*']
}
```

## Stripe Webhook — Raw Body Required

Stripe webhooks require the raw request body for signature verification. Next.js App Router needs explicit handling:

```typescript
// app/api/stripe/webhook/route.ts
import { headers } from 'next/headers'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text() // raw text, NOT req.json()
  const sig = headers().get('stripe-signature')!
  
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  // handle event
}
```

## Vercel Cron Routes

```typescript
// app/api/cron/rescan/route.ts
export async function POST(req: NextRequest) {
  // Verify it's actually Vercel calling this
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // run rescan logic
}
```

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/rescan",
    "schedule": "0 9 1 * *"
  }]
}
```

## Environment Variables

- `NEXT_PUBLIC_*` — available in browser AND server
- No prefix — server only (never exposed to browser)
- Access: `process.env.VARIABLE_NAME`

## Error Handling Pattern

```typescript
// Consistent API error responses
function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

// Usage
if (!user) return apiError('Unauthorized', 401)
if (!scan) return apiError('Scan not found', 404)
```

## Common Gotchas

- `cookies()` from `next/headers` is server-only — don't call in client components
- Route handlers don't have access to `req.body` — use `req.json()` or `req.text()`
- Vercel Edge Runtime doesn't support Node.js APIs — keep heavy processing in Node runtime
- Add `export const runtime = 'nodejs'` to routes using Playwright, PDFs, or native Node modules
