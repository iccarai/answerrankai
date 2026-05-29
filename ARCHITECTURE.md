# AnswerRank AI — Architecture & Build Plan
**Owner:** Alex Richinski / ICC  
**Date:** May 2026  
**Status:** Architecture Updated — Build in Progress  
**Repo:** https://github.com/iccarai/answerrankai

---

## What AnswerRank AI Is

AnswerRank AI is the brand. TSO (Total Search Optimization) is the service.

TSO covers all four modern search surfaces simultaneously:
- **SEO** — Search Engine Optimization (Google/Bing rankings, technical health)
- **AEO** — Answer Engine Optimization (featured snippets, voice search)
- **AIO** — AI Overviews Optimization (Google AI Overviews eligibility)
- **GEO** — Generative Engine Optimization (ChatGPT, Perplexity, Gemini, Google AI)

**Lovable is no longer part of this build.** All files are manually owned and built via Claude Code CLI, hosted on GitHub, deployed to Vercel.

---

## Ownership Boundary (Critical)

All files are manually owned. No external UI generation tool is used.

| Zone | Owner | Files |
|---|---|---|
| UI / Pages | Manual | `app/page.tsx`, `app/report-preview/page.tsx`, `app/scan/page.tsx`, `components/` |
| Engine / API / DB | Manual | `lib/`, `app/api/`, `supabase/`, `store/`, config |
| Shared | Manual | `app/layout.tsx`, `app/globals.css`, `.env.local` |

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 App Router + TypeScript | All routes use App Router conventions |
| Styling | Tailwind CSS | Manually managed |
| Database | Supabase (PostgreSQL) | Auth + RLS + realtime |
| AI — Claude | claude-sonnet-4-6 (Anthropic) | Primary query engine |
| AI — Perplexity | sonar-medium-online | Real-time web retrieval |
| AI — Gemini | gemini-1.5-flash | Google ecosystem signals |
| SerpAPI | Google Search + AI Overview API | Replaces PSE (deprecated Jan 2026) — two-call AIO flow |
| Payments | Stripe | One-time audit + DFY manual link |
| Email | Resend | Monthly reports + transactional |
| PDF | react-pdf | Branded report output |
| Cron | Vercel Cron | Monthly re-scan jobs |
| Hosting | Vercel | |
| SEO Tooling (DFY ops) | Screaming Frog (~$215/yr), Google Search Console (free), Bing Webmaster Tools (free), Ahrefs Webmaster Tools (free), Google PageSpeed Insights (free), Google Rich Results Test (free) | Used by Alex for DFY client execution — not part of the app |

---

## Pricing (Locked — May 2026)

| Tier | Price | Model | Notes |
|---|---|---|---|
| TSO Audit | $297 | One-time | Full TSO audit across SEO, AEO, AIO, GEO. $297 credited toward DFY month 1 if client proceeds. |
| Done-For-You TSO | $1,497/month | Retainer | Alex executes full Fix List monthly. 3-month minimum. Month-to-month after. Capped at 20 clients. |

**Old pricing retired:** $97 audit, $79/month, $699/year, $997/month DFY — do not reference these anywhere.

**Stripe products to update:**
- Create `price_audit_297` — one-time, $297
- Create `price_dfy_1497` — recurring monthly, $1,497 (DFY is manual Stripe link, not self-serve)
- Remove/archive old price IDs

---

## Scan Execution Model

### Hybrid Parallel Execution
- All 4 platforms fire simultaneously (parallel)
- Within each platform, prompts run sequentially
- Progress UI updates as each platform completes
- Estimated scan time: 60–120 seconds

### Prompt Strategy
- 15 prompts per business per platform
- Each prompt runs 3 times, results averaged
- Total API calls per scan: 15 × 3 × 4 = **180 calls**
- Estimated cost per scan: **$0.20–$0.45**

### Google AI Overviews Approach
Uses SerpAPI's two-call flow (PSE removed — deprecated Jan 2026). Platform identifier: `serpapi_google`.
1. **Call 1** — `engine=google` (`hl=en`, `gl=us`): returns the `ai_overview` object plus `organic_results`.
2. The `ai_overview` arrives in one of three states:
   - **State A (inline)** — `text_blocks` present → AIO fired; parse references + snippets.
   - **State B (deferred)** — only a `page_token` (expires ~1 min) → fire **Call 2** (`engine=google_ai_overview`) immediately.
   - **State C (absent/error)** — `ai_overview` missing or `error` → query type not eligible (`aioSuppressed`).
3. Each `QueryResult` carries `aioFired`, `aioEligible`, `organicPosition`, and `aioSuppressed` so scoring can distinguish "fired but not cited" (fixable) from "query type not eligible" (not fixable).
4. Report label: **"Google AI Overviews"** when AIO fires, **"Google Search Visibility"** when it does not — never an empty pillar.

---

## Paywall Model

Payment first, scan after:
1. User completes onboarding form → Stripe checkout
2. Stripe webhook → `checkout.session.completed`
3. Webhook creates scan record, triggers scan job
4. User redirected to `/results/[scanId]` with loading state
5. Scan completes → results rendered
6. Failure → retry once, then error + email support

---

## Database Schema (Supabase)

```sql
-- Users managed by Supabase Auth (auth.users)

create table businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  location text not null,
  industry text not null,
  competitors jsonb default '[]',
  created_at timestamptz default now()
);

create table scans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  user_id uuid references auth.users(id),
  status text default 'pending', -- pending | running | complete | failed
  stripe_session_id text,
  tier text not null, -- one_time | dfy
  triggered_at timestamptz default now(),
  completed_at timestamptz
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references scans(id) on delete cascade,
  user_id uuid references auth.users(id),
  overall_score integer,
  platform_scores jsonb, -- {chatgpt, perplexity, gemini, google}
  competitor_data jsonb,
  sentiment_data jsonb,
  citation_sources jsonb,
  fix_items jsonb,
  raw_results jsonb,
  created_at timestamptz default now()
);

create table fix_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  priority integer,
  tag text, -- High Impact | Medium Impact | Foundational
  title text,
  why text,
  failure_mode text
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  tier text, -- one_time | dfy
  status text, -- active | cancelled | past_due
  current_period_end timestamptz,
  created_at timestamptz default now()
);
```

### RLS Policies
```sql
alter table businesses enable row level security;
alter table scans enable row level security;
alter table reports enable row level security;
alter table fix_items enable row level security;
alter table subscriptions enable row level security;

create policy "users_own_data" on businesses
  for all using (auth.uid() = user_id);
-- Repeat for each table
```

---

## Score Calculation

| Component | Weight | Calculation |
|---|---|---|
| Brand mention rate | 35% | (mentions / total_queries) × 100 |
| Citation source rate | 20% | (cited_as_source / total_queries) × 100 |
| Sentiment score | 20% | weighted avg: positive(1) / neutral(0.5) / negative(0) |
| Platform coverage | 15% | (platforms_with_mention / 4) × 100 |
| Competitor displacement | 10% | inverse: (1 − competitor_mention_rate) × 100 |

Final score: weighted sum, clamped 0–100, rounded to integer.

---

## File Structure

```
answerrankai/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                      ← Landing page v3 (AnswerRankAI-Landing-v3.tsx)
│   ├── report-preview/
│   │   └── page.tsx                  ← Sample report preview
│   ├── scan/
│   │   └── page.tsx                  ← Onboarding form
│   ├── results/
│   │   └── [scanId]/
│   │       └── page.tsx              ← Results view
│   ├── dashboard/
│   │   └── page.tsx                  ← Client dashboard
│   └── api/
│       ├── scan/route.ts             ← POST: initiate scan
│       ├── report/[scanId]/route.ts  ← GET: fetch report
│       ├── report/[scanId]/pdf/route.ts ← GET: generate PDF
│       ├── scans/route.ts            ← GET: scan history
│       ├── stripe/checkout/route.ts  ← POST: create checkout session
│       ├── stripe/webhook/route.ts   ← POST: handle Stripe events
│       └── cron/rescan/route.ts      ← POST: monthly rescan
│
├── lib/
│   ├── aiQuery.ts                    ← All 4 providers + parallel execution
│   ├── scoreEngine.ts                ← AI Visibility Score calculation
│   ├── fixListEngine.ts              ← Fix list generation
│   ├── reportBuilder.ts              ← Assembles report object
│   ├── pdf.ts                        ← PDF generation (Phase 5)
│   ├── stripe.ts                     ← Stripe instance + helpers
│   └── supabase/
│       ├── client.ts                 ← Browser client
│       ├── server.ts                 ← Server client (API routes)
│       └── admin.ts                  ← Service role (webhooks + cron)
│
├── store/
│   └── useReportStore.ts             ← Zustand: scan state, results, loading
│
├── types/
│   └── index.ts                      ← All shared TypeScript types
│
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── seed.sql
│
├── components/                       ← Manually owned UI components
│
├── ARCHITECTURE.md                   ← This file
├── .env.local.template
├── .env.local                        ← Gitignored
├── next.config.ts
├── tsconfig.json
└── package.json
```

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

# SerpAPI — Google AI Overviews (replaces Google PSE)
SERPAPI_KEY=

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
CRON_SECRET=

# Discovery Call Booking (swap when ready)
NEXT_PUBLIC_DISCOVERY_CALL_URL=[DISCOVERY_CALL_URL]
```

---

## Build Status (May 2026)

### ✅ Complete
- Phase 1 — Core engine: `types/index.ts`, all `lib/` files (aiQuery, scoreEngine, fixListEngine, reportBuilder, supabase clients)
- Phase 2 — Database: `supabase/migrations/001_initial_schema.sql`, RLS policies, `seed.sql`, `.env.local.template`
- Landing page v3 — `AnswerRankAI-Landing-v3.tsx` (TSO positioning, new pricing, 4-pillar section)

### ❌ Not Built
- `app/page.tsx` — needs `AnswerRankAI-Landing-v3.tsx` content copied in
- Phase 3 — All `app/api/` routes (Stripe webhook, scan, report, cron)
- Phase 4 — `store/useReportStore.ts`, results page data binding, client dashboard
- Phase 5 — `lib/pdf.ts`, Resend email integration
- Phase 6 — QA, Stripe CLI test, Vercel Cron config, production deploy

### ❌ Accounts Not Yet Set Up
| Service | Status |
|---|---|
| Supabase project | Not created — need URL + anon key + service role key |
| Resend | Not created — need to verify answerrank.ai domain |
| SerpAPI | Not enabled — need API key (free tier = 250 searches/mo) |
| Stripe products | Need new price IDs ($297 audit, $1,497 DFY) |
| Discovery call booking | Domain not purchased — cal.com TBD |
| Anthropic API | ✅ Active |
| Perplexity API | ✅ Active |
| Gemini API | ✅ Active |
| Stripe (account) | ✅ Active — price IDs need updating |

---

## Immediate Next Steps (In Order)

1. Copy `AnswerRankAI-Landing-v3.tsx` into `app/page.tsx`
2. Create Supabase project → add keys to `.env.local`
3. Create Resend account → verify `answerrank.ai` domain
4. Create SerpAPI account → get `SERPAPI_KEY` (free tier = 250 searches/mo)
5. Update Stripe price IDs to `$297` audit and `$1,497` DFY
6. Build Phase 3 API routes in Claude Code
7. Build Phase 4 store + dashboard
8. Build Phase 5 PDF + email
9. Purchase domain for discovery call booking → swap `[DISCOVERY_CALL_URL]`
10. Phase 6 QA + launch

---

## Windows Path Note

Alex's machine has a space in the Windows username. Always use quoted paths:
```bash
cd "C:\Users\Richie Onions\answerrankai"
```
Approve all permission prompts (option 1) during `/init` and build sessions.

---

*AnswerRank AI — Internal Architecture Doc. ICC / Alex Richinski. Do not share externally.*
