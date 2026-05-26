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

## Build Status (May 2026)

### ✅ Complete
- **Phase 1 (Engine)**: All `lib/` files built (`aiQuery.ts`, `scoreEngine.ts`, `fixListEngine.ts`, `reportBuilder.ts`, supabase clients)
- **Phase 2 (Database)**: Schema, RLS policies, seed data defined in `ARCHITECTURE.md`
- **Types**: `types/index.ts` with all platform, business, report types
- **Landing page**: `AnswerRankAI-Landing-v3.tsx` ready to integrate

### ❌ Not Built (In Order of Priority)

1. **Next.js App Structure** — `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/globals.css`
2. **Landing Page** — Copy `AnswerRankAI-Landing-v3.tsx` into `app/page.tsx`
3. **Phase 3 (API Routes)** — All handlers in `app/api/`:
   - `scan/route.ts` — POST: initiate scan
   - `report/[scanId]/route.ts` — GET: fetch report
   - `report/[scanId]/pdf/route.ts` — GET: generate PDF
   - `scans/route.ts` — GET: scan history
   - `stripe/checkout/route.ts` — POST: create session
   - `stripe/webhook/route.ts` — POST: handle Stripe events
   - `cron/rescan/route.ts` — POST: monthly rescan
4. **Phase 4 (Client State)** — `store/useReportStore.ts` (Zustand), results page data binding, dashboard
5. **Phase 5 (PDF/Email)** — `lib/pdf.ts`, Resend integration
6. **Phase 6 (QA/Deploy)** — Stripe CLI testing, Vercel Cron config, environment setup

### ❌ Infrastructure Not Set Up
- Supabase project (need project URL, anon key, service role key)
- Resend account (need domain verification for `answerrank.ai`)
- Google PSE (need API key + engine ID)
- Stripe price IDs (`price_audit_297`, `price_dfy_1497`)

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
| `lib/pdf.ts` | PDF generation via react-pdf | ❌ Not built (Phase 5) |
| `lib/stripe.ts` | Stripe instance + helpers | ❌ Not built (Phase 3) |
| `types/index.ts` | All TypeScript types and enums | ✅ Built |

### Pages & Routes

```
app/
  ├── page.tsx                       ← Landing (copy v3 here)
  ├── scan/page.tsx                  ← Onboarding form (Phase 4)
  ├── results/[scanId]/page.tsx      ← Results view (Phase 4)
  ├── dashboard/page.tsx             ← Client dashboard (Phase 4)
  ├── report-preview/page.tsx        ← Static preview
  ├── layout.tsx                     ← Root layout (Phase 1)
  ├── globals.css                    ← Global styles (Phase 1)
  └── api/
      ├── scan/route.ts              ← POST: initiate scan (Phase 3)
      ├── report/[scanId]/route.ts   ← GET: fetch report (Phase 3)
      ├── report/[scanId]/pdf/route.ts ← GET: generate PDF (Phase 5)
      ├── scans/route.ts             ← GET: scan history (Phase 3)
      ├── stripe/checkout/route.ts   ← POST: create session (Phase 3)
      ├── stripe/webhook/route.ts    ← POST: Stripe events (Phase 3)
      └── cron/rescan/route.ts       ← POST: monthly rescan (Phase 3)

store/
  └── useReportStore.ts              ← Zustand state (Phase 4)

lib/                                 ✅ All built

types/                               ✅ All built

ARCHITECTURE.md                       ← Source of truth
```

---

## Development Setup

### Prerequisites

Node.js 18+ and npm/yarn. Project structure not yet initialized.

### Initialize Next.js Project

```bash
cd "C:\Users\Richie Onions\answerrankai"

# Option A: Create from scratch with create-next-app
npx create-next-app@latest . --typescript --tailwind --app --no-git

# Option B: Manual setup
npm init -y
npm install next react react-dom typescript @types/react @types/node
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Environment Setup

Copy `.env.local.template` to `.env.local` and fill in all keys (see `ARCHITECTURE.md`). Without these, API routes will fail:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers
ANTHROPIC_API_KEY=
PERPLEXITY_API_KEY=
GOOGLE_AI_API_KEY=

# Google PSE
GOOGLE_PSE_API_KEY=
GOOGLE_PSE_ENGINE_ID=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_AUDIT_297=
STRIPE_PRICE_DFY_1497=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=reports@answerrank.ai

# App
NEXT_PUBLIC_APP_URL=https://answerrank.ai
CRON_SECRET=[generate a random string]
```

### Common Commands

```bash
# Development
npm run dev                 # Start dev server (localhost:3000)

# Build
npm run build              # Compile for production

# Type checking
npx tsc --noEmit          # Check for type errors

# Linting (if configured)
npm run lint              # Run ESLint

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

1. **Initialize Next.js** — `npm init` + install dependencies, set up `tsconfig.json`, `next.config.ts`
2. **Copy landing page** — `AnswerRankAI-Landing-v3.tsx` → `app/page.tsx`
3. **Set up environment** — Create `.env.local` from template
4. **Verify types** — Run `tsc --noEmit` to check types in existing files
5. **Build Phase 3 API routes** — All `app/api/*` handlers
6. **Build Phase 4 client state** — Zustand store, results/dashboard pages

See `ARCHITECTURE.md` for detailed build phases and accounts that need setup.

---

## References

- **ARCHITECTURE.md** — Source of truth for architecture, phases, pricing, accounts
- **lib/** — All business logic (✅ built)
- **types/index.ts** — All TypeScript types (✅ built)
- **SKILL-nextjs-app-router.md** — Next.js 14 patterns
- **SKILL-supabase-patterns.md** — Database & auth patterns
- **~/.claude/rules/typescript/** — TypeScript/JavaScript conventions
