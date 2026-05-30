# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: Read ARCHITECTURE.md First

**Before making any changes, read `ARCHITECTURE.md`.** It is the source of truth for:
- What's been built vs. what's not
- The scan execution model and scoring algorithm
- Database schema and payment flow
- Pricing tiers (locked May 2026)
- Build phases and immediate next steps

---

## Project Overview

**AnswerRank AI** is a SaaS platform for **TSO (Total Search Optimization)** — optimizing business visibility across four AI platforms simultaneously:

- **SEO** — Google/Bing rankings
- **AEO** — Answer Engine Optimization (featured snippets, voice search)
- **AIO** — AI Overviews Optimization (Google AI Overviews)
- **GEO** — Generative Engine Optimization (ChatGPT, Perplexity, Gemini)

Users pay **$297 for a one-time TSO Audit** or **$1,497/month for Done-For-You management** (3-month minimum, capped at 20 clients).

### Key Constraint

**All files are manually owned.** No Lovable or external code generation tools. This repo is the source of truth for all code.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | Next.js 14 App Router + TypeScript | Vercel deployment, `app/` directory only |
| **UI/Styling** | Tailwind CSS | No component libraries; manually built |
| **Database** | Supabase (PostgreSQL) | Auth, RLS policies, realtime subscriptions |
| **AI Engines** | Claude (Anthropic), Perplexity, Gemini, Google PSE | Parallel execution, 15 prompts × 3 runs per platform |
| **Payments** | Stripe | Webhook-triggered scan execution |
| **Email** | Resend | Monthly reports + transactional |
| **PDF** | react-pdf | Branded report generation |
| **Cron** | Vercel Cron | Monthly rescan jobs (`app/api/cron/rescan/route.ts`) |

---

## Build Status

> Keep this section honest — it drifts fast. Verify against the actual tree before trusting it.

### ✅ Built
- **Next.js scaffold**: `package.json`, `tsconfig.json`, `next.config.js`, `next-env.d.ts`, `app/layout.tsx`, `app/globals.css`, `vercel.json` (cron configured)
- **Phase 1 (Engine)**: All `lib/` business logic — `aiQuery.ts`, `scoreEngine.ts`, `fixListEngine.ts`, `reportBuilder.ts`, `stripe.ts`, and the three supabase clients
- **Phase 2 (Database)**: `supabase/migrations/001_initial_schema.sql` (schema + RLS)
- **Types**: `types/index.ts`
- **Landing page**: `app/page.tsx` (live) + `app/report-preview/page.tsx`
- **Phase 3 (most API routes)**: `app/api/scan`, `report/[scanId]`, `report/[scanId]/pdf`, `scans`, `stripe/webhook`, `cron/rescan`, plus the shared helper `app/api/utils/scanExecution.ts`

### ❌ Not Yet Built
1. **Phase 4 (Client pages + state)** — `app/scan/page.tsx` (onboarding form), `app/results/[scanId]/page.tsx`, `app/dashboard/page.tsx`, and `store/useReportStore.ts` (Zustand). This is the current frontier.
2. **Auth UI** — sign-in/sign-up flows
3. **Resend email** — monthly report + transactional sends

> Note: there is **no** `app/api/stripe/checkout/route.ts`. Checkout-session creation is folded into `app/api/scan/route.ts` (it creates the business + scan records, then the Stripe session, and returns `checkoutUrl`). PDF generation lives in the route `app/api/report/[scanId]/pdf/route.ts`, not a `lib/pdf.ts`.

### Infrastructure / accounts
Verify which of these are actually provisioned before assuming a scan can run end-to-end: Supabase project, Resend domain (`answerrank.ai`), Stripe price IDs (`stripe_price_audit_297`, `stripe_price_dfy_1497`), and AIO provider keys. See `ARCHITECTURE.md`.

---

## Architecture & Key Files

### Scan Execution Model (Critical)

**Parallel + Sequential Hybrid:**
- All 4 platforms (Claude, Perplexity, Gemini, Google PSE) fire **simultaneously**
- Within each platform, 15 prompts run **sequentially** (with 500ms delay between)
- Each prompt runs **3 times**, results averaged for stability
- Total API calls per scan: **15 × 3 × 4 = 180**
- Estimated cost: **$0.20–$0.45 per scan**
- Estimated time: **60–120 seconds**

Progress UI updates as each platform completes.

### Database Schema

Located in `ARCHITECTURE.md` — key tables:

```
businesses (id, user_id, name, location, industry, competitors)
scans (id, business_id, status, stripe_session_id, tier, triggered_at)
reports (id, scan_id, overall_score, platform_scores, fix_items, etc.)
fix_items (id, report_id, priority, tag, title, why, failure_mode)
subscriptions (id, user_id, stripe_subscription_id, tier, status)
```

All tables have RLS policies — users only see their own data.

### Payment & Scan Flow

1. User completes onboarding → Stripe checkout
2. `stripe/webhook/route.ts` receives `checkout.session.completed`
3. Webhook creates scan record, enqueues background job
4. User redirected to `/results/[scanId]` with loading state
5. Scan completes → results render
6. Failure → retry once, then error email

### Score Calculation

**Weighted Components (sum to 100%):**
- Brand mention rate: **35%** — (mentions / total_queries) × 100
- Citation source rate: **20%** — (cited_as_source / total_queries) × 100
- Sentiment score: **20%** — weighted avg of positive/neutral/negative mentions
- Platform coverage: **15%** — (platforms_with_mention / 4) × 100
- Competitor displacement: **10%** — inverse: (1 − competitor_mention_rate) × 100

Final score: weighted sum, clamped 0–100, rounded to integer.

### Core Library Files

| File | Purpose | Status |
|------|---------|--------|
| `lib/aiQuery.ts` | Query engine: prompt builder, parallel execution, response parsing | ✅ Built |
| `lib/scoreEngine.ts` | Score calculation from raw query results | ✅ Built |
| `lib/fixListEngine.ts` | AI-driven fix list generation from report data | ✅ Built |
| `lib/reportBuilder.ts` | Assembles final report object from all components | ✅ Built |
| `lib/supabase/client.ts` | Browser client (auth, realtime) | ✅ Built |
| `lib/supabase/server.ts` | Server client for API routes | ✅ Built |
| `lib/supabase/admin.ts` | Service role client for webhooks, cron | ✅ Built |
| `lib/stripe.ts` | Stripe instance + `createCheckoutSession()` helper | ✅ Built |
| `app/api/utils/scanExecution.ts` | Shared scan-execution orchestration used by routes | ✅ Built |
| `types/index.ts` | All TypeScript types and enums | ✅ Built |

### Pages & Routes

```
app/
  ├── page.tsx                       ← Landing (live)               ✅
  ├── report-preview/page.tsx        ← Static sample report          ✅
  ├── layout.tsx                     ← Root layout                   ✅
  ├── globals.css                    ← Global styles                 ✅
  ├── scan/page.tsx                  ← Onboarding form               ❌ Phase 4
  ├── results/[scanId]/page.tsx      ← Results view                  ❌ Phase 4
  ├── dashboard/page.tsx             ← Client dashboard              ❌ Phase 4
  └── api/
      ├── scan/route.ts              ← POST: create business+scan, return Stripe checkoutUrl  ✅
      ├── report/[scanId]/route.ts   ← GET: fetch report             ✅
      ├── report/[scanId]/pdf/route.ts ← GET: generate PDF           ✅
      ├── scans/route.ts             ← GET: scan history             ✅
      ├── stripe/webhook/route.ts    ← POST: Stripe events           ✅
      ├── cron/rescan/route.ts       ← POST: monthly rescan          ✅
      └── utils/scanExecution.ts     ← Shared scan orchestration     ✅

store/useReportStore.ts              ← Zustand state                 ❌ Phase 4
lib/                                 ← Business logic                ✅
types/index.ts                       ← All types                     ✅
supabase/migrations/                 ← Schema + RLS                   ✅
ARCHITECTURE.md                      ← Source of truth
```

> All API route handlers declare `export const dynamic = 'force-dynamic'` — keep this on new routes (they read auth/cookies and must not be statically cached).

---

## Development Setup

### Prerequisites

Node.js 18+. The project is already initialized — `npm install` to restore dependencies, then `npm run dev`.

### Environment Setup

Copy `.env.local.template` → `.env.local` and fill in the values. All env-var names are **UPPERCASE** across code, `.env.local`, and Vercel (`NEXT_PUBLIC_*` must be exact-case uppercase or Next.js won't expose it to the browser). The AIO provider is **SerpAPI** (`SERPAPI_KEY`) — Google PSE was removed. See `.env.local.template` for the full list.

Vercel: env vars live in the `answerrankai` project (Production has the full set; `SERPAPI_KEY` is also in Development; Preview is not yet populated). After changing any Vercel env var, **redeploy** for it to take effect.

### Common Commands

```bash
# Development
npm run dev                 # Start dev server (localhost:3000)

# Build
npm run build              # Compile for production

# Type checking
npx tsc --noEmit          # Check for type errors

# Linting (configured: next lint)
npm run lint              # Run ESLint via eslint-config-next

# Format
npx prettier --write .    # Format all files
```

---

## Coding Patterns & Conventions

### API Routes

All routes return JSON. Use `NextRequest` and `NextResponse`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // ... logic
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Server vs Client Components

- **Server Component** (default in `app/`) — use for data fetching, database queries
- **Client Component** — add `'use client'` for state, hooks, browser APIs

```typescript
// Server component — can await database queries
export default async function Page() {
  const data = await db.query()
  return <div>{data}</div>
}

// Client component — interactive
'use client'
export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

### Auth in Route Handlers

Use the Supabase server client:

```typescript
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Proceed
}
```

### Stripe Webhook (Raw Body Required)

Stripe signature verification needs the raw request body:

```typescript
import { headers } from 'next/headers'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text() // Use req.text(), NOT req.json()
  const sig = headers().get('stripe-signature')!
  
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  
  // Handle event (checkout.session.completed, invoice.payment_succeeded, etc.)
}
```

### Vercel Cron Routes

Monthly rescan at 9 AM UTC on the 1st:

```typescript
// app/api/cron/rescan/route.ts
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Run rescan logic
}
```

Configure in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/rescan",
    "schedule": "0 9 1 * *"
  }]
}
```

### Type Safety

All platform names and statuses are enums in `types/index.ts`:

```typescript
export type PlatformName = 'claude' | 'perplexity' | 'gemini' | 'google_pse'
export type ScanStatus = 'pending' | 'running' | 'complete' | 'failed'
```

Use these throughout — never hardcode strings.

---

## Key Decisions & Tradeoffs

### Why Parallel + Sequential Hybrid?

- Parallel platforms: maximize throughput, get results faster (60–120s vs. ~480s)
- Sequential prompts: respect API rate limits, avoid overwhelming token budgets
- Result: reliable execution at scale with stable costs ($0.20–$0.45/scan)

### Why Google Programmable Search Engine (PSE) for AIO?

- Honest proxy signal: uses Google's actual rankings (not scraping)
- Compliance: no ToS violations, fully supported by Google
- Stability: data matches what Google AI Overviews actually pulls from

### Why Stripe Webhook → Background Job?

- Payment first, scan after: prevents unpaid scans, clear billing
- Webhook triggers scan: decouples payment from scanning
- Retry logic: one automatic retry on failure, then error email

---

## Important Notes

### Windows Path

Always use quoted paths due to space in username:
```powershell
cd "C:\Users\Richie Onions\answerrankai"
```

### Build Artifacts Are Tracked in Git (gotcha)

`.next/` is listed in `.gitignore` but ~90 `.next/` files were committed before the ignore rule was added, so they remain tracked. A `git add -A` will sweep churned build artifacts into your commit. Either stage only the source files you changed, or run `git rm -r --cached .next` once to untrack them.

### Approve Permission Prompts

During Claude Code sessions, approve all permission prompts (option 1).

### Never Modify Landing Components Outside This Repo

The three landing files (`AnswerRankAI-Landing-v3.tsx`, `v2.tsx`, `v1.tsx`) are the only source of truth. They are NOT generated by Lovable — all changes must happen here, then be copied into `app/page.tsx`.

### Immutable Updates

Follow the global rules in `~/.claude/rules/common/coding-style.md`:
- Never mutate existing objects
- Use spread operator for updates
- Return new objects with changes applied

---

## Immediate Next Steps

The engine and most API routes exist. The frontier is **Phase 4 (client pages + state)**:

1. **`store/useReportStore.ts`** — Zustand store for report state
2. **`app/scan/page.tsx`** — onboarding form that POSTs to `/api/scan` and redirects to the returned `checkoutUrl`
3. **`app/results/[scanId]/page.tsx`** — loading + results view bound to `/api/report/[scanId]`
4. **`app/dashboard/page.tsx`** — client dashboard over `/api/scans`
5. **Auth UI** — sign-in/sign-up wired to the Supabase client

See `ARCHITECTURE.md` for detailed build phases and accounts that need setup.

---

## References

- **ARCHITECTURE.md** — Source of truth for architecture, phases, pricing, accounts
- **lib/** — All business logic (✅ built)
- **types/index.ts** — All TypeScript types (✅ built)
- **SKILL-nextjs-app-router.md** — Next.js 14 patterns
- **SKILL-supabase-patterns.md** — Database & auth patterns
- **~/.claude/rules/typescript/** — TypeScript/JavaScript conventions
