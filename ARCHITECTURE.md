# AnswerRank AI — Architecture & Build Plan
**Owner:** Alex Richinski / ICC  
**Date:** April 3, 2026  
**Status:** Architecture Locked — Pre-Build  
**Repo:** https://github.com/iccarai/answerrankai

---

## Ownership Boundary (Critical)

| Zone | Owner | Files |
|---|---|---|
| UI / Pages | Lovable | `components/`, `app/page.tsx`, `app/report-preview/page.tsx`, `app/scan/page.tsx` |
| Engine / API / DB | Manual (this codebase) | `lib/`, `app/api/`, `supabase/`, `store/`, config |
| Shared | Both — coordinate before touching | `app/layout.tsx`, `app/globals.css`, `.env.local` |

**Rule:** Never ask Lovable to regenerate anything under `lib/` or `app/api/`. Never manually edit Lovable-owned UI files.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 App Router + TypeScript | All routes use App Router conventions |
| Styling | Tailwind CSS | Lovable manages this |
| Database | Supabase (PostgreSQL) | Auth + RLS + realtime |
| AI — Query Engine | Claude (claude-sonnet-4-6) | Primary for ChatGPT-equivalent queries |
| AI — Perplexity | Perplexity API (sonar-medium-online) | Real-time web retrieval |
| AI — Gemini | Google AI API (gemini-1.5-flash) | Google ecosystem signals |
| AI — Google Search | Google Programmable Search Engine API | Proxy for AI Overviews signals (no scraping) |
| Proxy | Bright Data residential | Used with Google PSE to avoid rate limits |
| Payments | Stripe | One-time + recurring subscriptions |
| Email | Resend | Monthly reports + transactional |
| PDF | react-pdf | Branded report output |
| Cron | Vercel Cron | Monthly re-scan jobs |
| Hosting | Vercel | |

---

## Scan Execution Model

### Decision: Hybrid Parallel (C)
- Platforms run **in parallel** (all 4 fire simultaneously)
- Within each platform, prompts run **sequentially** with a short delay
- Progress UI updates as each platform completes
- Total estimated scan time: **60–120 seconds**

### Prompt Strategy
- 15 prompts per business per platform
- Each prompt runs **3 times**, results averaged (accounts for non-determinism)
- Total API calls per full scan: 15 prompts × 3 runs × 4 platforms = **180 calls**
- Estimated cost per scan: **$0.20–$0.45**

### Google AI Overviews Approach (Option C — No Scraping)
Instead of Playwright scraping, we use **Google Programmable Search Engine API** to:
1. Query Google for the business + industry + location
2. Analyze top-ranked results (which AIO pulls from)
3. Check if business content appears in positions 1–5 (AIO source zone)
4. Detect featured snippet eligibility as AIO proxy signal

This is stable, API-backed, and won't break. It's labeled in the report as "Google Search Visibility" rather than "Google AI Overviews" — honest and defensible.

---

## Paywall Model

**Decision: Payment first, scan after (B)**

Flow:
1. User completes onboarding form → hits Stripe checkout
2. Stripe webhook fires → `stripe/webhook/route.ts` receives `checkout.session.completed`
3. Webhook creates scan record in DB, triggers scan job
4. User redirected to `/results/[scanId]` with a loading state
5. Scan completes → results rendered
6. If scan fails → retry once automatically, then show error + email support

**Stripe Products to create:**
- `price_audit_97` — One-time, $97
- `price_monthly_79` — Recurring monthly, $79
- `price_annual_699` — Recurring yearly, $699
- DFY is Calendly → manual Stripe link (not self-serve)

---

## Database Schema (Supabase)

### Tables

```sql
-- Users managed by Supabase Auth (auth.users)

-- Business profiles
create table businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  location text not null,
  industry text not null,
  competitors jsonb default '[]', -- array of {name, location}
  created_at timestamptz default now()
);

-- Individual scan jobs
create table scans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  user_id uuid references auth.users(id),
  status text default 'pending', -- pending | running | complete | failed
  stripe_session_id text,
  tier text not null, -- one_time | monthly | annual
  triggered_at timestamptz default now(),
  completed_at timestamptz
);

-- Completed report data
create table reports (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references scans(id) on delete cascade,
  user_id uuid references auth.users(id),
  overall_score integer,
  platform_scores jsonb, -- {chatgpt: 0-100, perplexity: 0-100, gemini: 0-100, google: 0-100}
  competitor_data jsonb,
  sentiment_data jsonb,
  citation_sources jsonb,
  fix_items jsonb, -- ordered array of fix objects
  raw_results jsonb, -- full AI responses, stored for debugging
  created_at timestamptz default now()
);

-- Fix items (denormalized for easier querying)
create table fix_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  priority integer,
  tag text, -- High Impact | Medium Impact | Foundational
  title text,
  why text,
  failure_mode text -- what triggered this fix
);

-- Subscriptions
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  tier text, -- monthly | annual
  status text, -- active | cancelled | past_due
  current_period_end timestamptz,
  created_at timestamptz default now()
);
```

### Row Level Security (RLS) Policies

```sql
-- All tables: users can only read/write their own data
alter table businesses enable row level security;
alter table scans enable row level security;
alter table reports enable row level security;
alter table fix_items enable row level security;
alter table subscriptions enable row level security;

-- Example policy (repeat for each table):
create policy "users_own_data" on businesses
  for all using (auth.uid() = user_id);
```

---

## File Structure

```
answerrankai/
├── app/
│   ├── layout.tsx                    ← Root layout (shared)
│   ├── globals.css
│   ├── page.tsx                      ← Landing page (Lovable)
│   ├── report-preview/
│   │   └── page.tsx                  ← Sample report (Lovable)
│   ├── scan/
│   │   └── page.tsx                  ← Onboarding form (Lovable)
│   ├── results/
│   │   └── [scanId]/
│   │       └── page.tsx              ← Results view (Lovable UI, manual data)
│   ├── dashboard/
│   │   └── page.tsx                  ← Account dashboard (Lovable)
│   ├── done-for-you/
│   │   └── page.tsx                  ← DFY page + Calendly (Lovable)
│   └── api/
│       ├── scan/
│       │   └── route.ts              ← POST: initiate scan ← MANUAL
│       ├── report/
│       │   └── [scanId]/
│       │       ├── route.ts          ← GET: fetch report ← MANUAL
│       │       └── pdf/
│       │           └── route.ts      ← GET: generate PDF ← MANUAL
│       ├── scans/
│       │   └── route.ts              ← GET: scan history ← MANUAL
│       ├── stripe/
│       │   ├── checkout/
│       │   │   └── route.ts          ← POST: create checkout session ← MANUAL
│       │   └── webhook/
│       │       └── route.ts          ← POST: handle stripe events ← MANUAL
│       └── cron/
│           └── rescan/
│               └── route.ts          ← POST: monthly rescan job ← MANUAL
│
├── lib/
│   ├── aiQuery.ts                    ← Query engine (Claude, Perplexity, Gemini, Google PSE)
│   ├── scoreEngine.ts                ← AI Visibility Score calculation
│   ├── fixListEngine.ts              ← Fix list generation from score breakdown
│   ├── reportBuilder.ts              ← Assembles full report data object
│   ├── pdf.ts                        ← PDF generation
│   ├── supabase/
│   │   ├── client.ts                 ← Browser client
│   │   └── server.ts                 ← Server client (for API routes)
│   └── stripe.ts                     ← Stripe instance + helpers
│
├── store/
│   └── useReportStore.ts             ← Zustand: scan state, results, loading
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql    ← Full schema + RLS
│   └── seed.sql                      ← Dev seed data
│
├── components/                       ← Lovable owns this directory
│   ├── OnboardingForm.tsx
│   ├── ScanProgress.tsx
│   ├── ScoreDisplay.tsx
│   ├── CompetitorMatrix.tsx
│   ├── SentimentBreakdown.tsx
│   ├── CitationSources.tsx
│   ├── FixList.tsx
│   ├── ScoreHistory.tsx
│   └── PricingCards.tsx
│
├── types/
│   └── index.ts                      ← Shared TypeScript types
│
├── ARCHITECTURE.md                   ← This file
├── .env.local.template               ← All required env vars (no values)
├── .env.local                        ← Gitignored — real values
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## AI Query Engine Design

### Provider Abstraction

Each platform implements a common interface so providers are swappable:

```typescript
interface AIProvider {
  name: 'claude' | 'perplexity' | 'gemini' | 'google_pse'
  query(prompt: string, business: BusinessContext): Promise<QueryResult>
}

interface QueryResult {
  platform: string
  prompt: string
  response: string
  brandMentioned: boolean
  brandSentiment: 'positive' | 'neutral' | 'negative' | 'not_mentioned'
  competitorsMentioned: string[]
  citationUrls: string[]
  rawResponse: string
  runIndex: number
}
```

### Parallel Execution Flow

```
scan triggered
    │
    ├─── Claude queries     (15 prompts × 3 runs, sequential within)
    ├─── Perplexity queries (15 prompts × 3 runs, sequential within)
    ├─── Gemini queries     (15 prompts × 3 runs, sequential within)
    └─── Google PSE queries (15 prompts × 3 runs, sequential within)
         │
    Promise.allSettled() — all 4 run simultaneously
         │
    scoreEngine.calculate(allResults)
         │
    fixListEngine.generate(scoreBreakdown)
         │
    reportBuilder.assemble(score, fixes, rawData)
         │
    supabase.insert(report)
         │
    status → 'complete'
```

### Score Calculation

| Component | Weight | Calculation |
|---|---|---|
| Brand mention rate | 35% | (mentions / total_queries) × 100 |
| Citation source rate | 20% | (cited_as_source / total_queries) × 100 |
| Sentiment score | 20% | weighted avg of positive(1) / neutral(0.5) / negative(0) |
| Platform coverage | 15% | (platforms_with_mention / 4) × 100 |
| Competitor displacement | 10% | inverse: (1 - competitor_mention_rate) × 100 |

**Final score:** weighted sum, clamped 0–100, rounded to integer

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers
ANTHROPIC_API_KEY=
PERPLEXITY_API_KEY=
GOOGLE_AI_API_KEY=

# Google Programmable Search Engine
GOOGLE_PSE_API_KEY=
GOOGLE_PSE_ENGINE_ID=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_AUDIT_97=
STRIPE_PRICE_MONTHLY_79=
STRIPE_PRICE_ANNUAL_699=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=reports@answerrank.ai

# Bright Data (optional — for Google PSE rate limit bypass)
BRIGHT_DATA_PROXY_URL=

# App
NEXT_PUBLIC_APP_URL=https://answerrank.ai
CRON_SECRET=
```

---

## Build Phases

### Phase 1 — Core Engine (Sessions 1–2)
- [ ] `types/index.ts` — all shared types
- [ ] `lib/supabase/client.ts` + `server.ts`
- [ ] `lib/stripe.ts`
- [ ] `lib/aiQuery.ts` — all 4 providers + parallel execution
- [ ] `lib/scoreEngine.ts`
- [ ] `lib/fixListEngine.ts`
- [ ] `lib/reportBuilder.ts`

### Phase 2 — Database (Session 2)
- [ ] `supabase/migrations/001_initial_schema.sql`
- [ ] RLS policies
- [ ] `supabase/seed.sql`

### Phase 3 — API Routes (Session 3)
- [ ] `app/api/stripe/checkout/route.ts`
- [ ] `app/api/stripe/webhook/route.ts`
- [ ] `app/api/scan/route.ts`
- [ ] `app/api/report/[scanId]/route.ts`
- [ ] `app/api/report/[scanId]/pdf/route.ts`
- [ ] `app/api/scans/route.ts`
- [ ] `app/api/cron/rescan/route.ts`

### Phase 4 — Lovable UI Wiring (Session 4)
- [ ] Pass scan state from API to Lovable components via store
- [ ] `store/useReportStore.ts`
- [ ] Results page data binding
- [ ] Dashboard scan history

### Phase 5 — PDF + Email (Session 5)
- [ ] `lib/pdf.ts` — react-pdf branded report
- [ ] Resend integration — monthly report delivery

### Phase 6 — QA + Launch (Session 6)
- [ ] End-to-end test: real business scan
- [ ] Stripe webhook local test (Stripe CLI)
- [ ] Vercel Cron config
- [ ] Production deploy

---

## Skills to Build Before Coding

1. **`nextjs-app-router`** — Route handlers, server components, middleware, cookies
2. **`supabase-patterns`** — RLS, server vs browser client, auth helpers, edge functions

---

*AnswerRank AI — Internal Architecture Doc. ICC / Alex Richinski. Do not share externally.*
