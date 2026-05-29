# SerpAPI Integration Spec — AnswerRank AI
**File target:** `lib/aiQuery.ts` — Google pillar only  
**Owner:** Alex Richinski / ICC  
**Date:** May 29, 2026  
**Status:** Spec Locked — Ready for Claude Code  
**Source verified:** serpapi.com/ai-overview + serpapi.com/google-ai-overview-api + serpapi.com/release-notes (May 2026)

---

## Context

This spec replaces the original Google PSE approach in `lib/aiQuery.ts`. PSE was deprecated for new engines on January 20, 2026. SerpAPI is the verified replacement for Google AI Overviews scanning.

The Google pillar in AnswerRank AI was previously labeled "Google AI Overviews" in the architecture. This spec confirms the naming, the field mapping, and the two-call flow required.

---

## What SerpAPI Returns — Verified Fields (Do Not Guess)

### Call 1 — Google Search API
**Endpoint:** `https://serpapi.com/search?engine=google`  
**Required params:** `q`, `api_key`, `hl=en`, `gl=us` (or client location)

The initial search response returns an `ai_overview` object. There are three possible states:

#### State A — AIO embedded inline (most common)
```json
{
  "ai_overview": {
    "text_blocks": [...],
    "thumbnail": "String - URL",
    "header_images": [{ "image": "String", "source": "String" }],
    "references": [
      {
        "title": "String",
        "link": "String - full URL",
        "snippet": "String",
        "source": "String - domain name label",
        "index": 0
      }
    ]
  }
}
```

`text_blocks` array items have these verified types:
- `paragraph` → has `snippet`, optional `snippet_highlighted_words[]`, optional `snippet_links[]`, optional `reference_indexes[]`
- `heading` → has `snippet`
- `list` → has `list[]` array, each item has `snippet`, optional `title`, optional `thumbnail`, optional `reference_indexes[]`, optional nested `list[]`
- `expandable` → has `title`, `subtitle`, `text_blocks[]` (recursive)
- `table` → has `table[][]`, `detailed[][]`, `formatted`
- `comparison` → has `product_labels[]`, `comparison[]` with `feature` and `values[]`

#### State B — AIO deferred (requires second call)
```json
{
  "ai_overview": {
    "page_token": "String - expires in 4 minutes",
    "serpapi_link": "String - full second call URL"
  }
}
```

#### State C — AIO not triggered / error
```json
{
  "ai_overview": {
    "error": "Can't generate an AI overview right now. Try again later."
  }
}
```
OR: `ai_overview` field is absent entirely — means query type does not trigger AIO.

Also returned from Call 1 (used for fallback scoring):
```json
{
  "organic_results": [
    {
      "position": 1,
      "title": "String",
      "link": "String - full URL",
      "snippet": "String",
      "domain": "String"
    }
  ]
}
```

---

### Call 2 — Google AI Overview API (only when State B)
**Endpoint:** `https://serpapi.com/search?engine=google_ai_overview`  
**Required params:** `page_token` (from Call 1), `api_key`  
**Critical:** `page_token` expires **within 1 minute** of Call 1. Must fire immediately.

Returns same structure as State A `ai_overview` above.

---

## Decisions Locked for This Integration

### AIO Not Firing
Two reasons AIO returns nothing:
1. **Query type suppressed** — Google doesn't show AIO for this query category (e.g., transactional local queries). Not fixable.
2. **Content not authoritative enough** — AIO fires but business isn't cited. Fixable.

The code **must distinguish** between these two states and pass different flags to `scoreEngine.ts`.

### Score Behavior
- AIO fires + brand mentioned → full score contribution
- AIO fires + brand not mentioned → zero score for AIO sub-component, but `aioEligible: true` → Fix List item generated
- AIO doesn't fire (absent/error) → `aioEligible: false` → report shows "Query type not eligible for AI Overview" with explanation
- Organic result in top 5 → secondary Google score contribution regardless of AIO state

### Report Labeling
- When AIO fires: label pillar **"Google AI Overviews"**
- When AIO absent: label pillar **"Google Search Visibility"**
- Never show an empty pillar with no explanation

---

## Mapping SerpAPI Fields → Existing QueryResult Type

Current `QueryResult` type (from `types/index.ts`):
```typescript
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

### Mapping Table

| QueryResult field | SerpAPI source | Logic |
|---|---|---|
| `platform` | hardcoded | `'google_pse'` → update to `'serpapi_google'` |
| `prompt` | passed in | the query string sent to SerpAPI |
| `response` | `ai_overview.text_blocks[].snippet` joined | concatenate all paragraph + list snippets into readable string; if no AIO, use top organic snippet |
| `brandMentioned` | `ai_overview.references[]` + `text_blocks[].snippet` | check if business name appears in any reference `title`, `source`, `link`, or any `snippet` text |
| `brandSentiment` | `text_blocks[].snippet` where brand mentioned | string match sentiment against business name context; default `'not_mentioned'` if not present |
| `competitorsMentioned` | `ai_overview.references[]` + `text_blocks[].snippet` | check each competitor name against same fields |
| `citationUrls` | `ai_overview.references[].link` | extract all reference URLs |
| `rawResponse` | full `ai_overview` object | `JSON.stringify(serpApiResponse.ai_overview)` |
| `runIndex` | passed in | 0, 1, or 2 (three runs per prompt) |

### New fields to ADD to QueryResult (extend the type)
```typescript
interface QueryResult {
  // ... existing fields ...
  aioFired: boolean          // true if ai_overview had text_blocks, false if absent/error
  aioEligible: boolean       // true if aioFired OR organic results returned (query was valid)
  organicPosition: number | null  // position (1–10) of brand's own domain in organic_results, null if not found
  aioSuppressed: boolean     // true if ai_overview field absent entirely (not a content problem)
}
```

---

## Environment Variable

Add to `.env.local` and Vercel:
```
SERPAPI_KEY=
```

Add to `.env.local.template`:
```
# SerpAPI — Google AI Overviews
SERPAPI_KEY=
```

**Note:** Free tier = 250 searches/month. No plan change needed to start.

---

## Call Flow (Pseudocode for Claude Code)

```typescript
async function queryGoogleSerpAPI(
  prompt: string,
  business: BusinessContext,
  runIndex: number
): Promise<QueryResult> {

  // Call 1 — Google Search
  const call1 = await fetch(
    `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(prompt)}&api_key=${process.env.SERPAPI_KEY}&hl=en&gl=us`
  )
  const data1 = await call1.json()
  
  let aioData = data1.ai_overview ?? null
  let aioFired = false
  let aioSuppressed = false

  // State B — deferred, needs second call
  if (aioData?.page_token) {
    // page_token expires in 1 minute — fire immediately
    const call2 = await fetch(
      `https://serpapi.com/search.json?engine=google_ai_overview&page_token=${aioData.page_token}&api_key=${process.env.SERPAPI_KEY}`
    )
    const data2 = await call2.json()
    aioData = data2.ai_overview ?? null
  }

  // Determine AIO state
  if (aioData?.text_blocks?.length > 0) {
    aioFired = true
  } else if (!aioData || aioData?.error) {
    aioSuppressed = true  // Query type not eligible
  }

  // Extract fields
  const references = aioData?.references ?? []
  const textBlocks = aioData?.text_blocks ?? []
  const organicResults = data1.organic_results ?? []

  // Brand detection
  const brandMentioned = checkBrandMentioned(business.name, references, textBlocks)
  const competitorsMentioned = checkCompetitors(business.competitors, references, textBlocks)
  const citationUrls = references.map(r => r.link).filter(Boolean)
  const organicPosition = findOrganicPosition(business.domain, organicResults)
  const brandSentiment = deriveSentiment(business.name, textBlocks, brandMentioned)
  const response = buildResponseString(textBlocks, organicResults)

  return {
    platform: 'google',
    prompt,
    response,
    brandMentioned,
    brandSentiment,
    competitorsMentioned,
    citationUrls,
    rawResponse: JSON.stringify(aioData ?? data1.organic_results?.slice(0, 3)),
    runIndex,
    aioFired,
    aioEligible: aioFired || organicResults.length > 0,
    organicPosition,
    aioSuppressed
  }
}
```

---

## Credit Usage (Free Tier Math)

| Action | Credits |
|---|---|
| Call 1 (Google Search) | 1 |
| Call 2 (AI Overview deferred) | 1 additional |
| Per prompt per run | 1–2 credits |
| Per full scan (15 prompts × 3 runs) | 45–90 credits |
| Free tier monthly | 250 credits |
| Max scans on free tier | ~3–5 full scans |

**At 20 DFY clients × 1 monthly rescan:** ~900–1,800 credits/month → Developer plan ($75/mo, 5,000 credits).

---

## Release Notes — Relevant Recent Fixes (Verified May 2026)

These were fixed in May 2026 and are now resolved — no workarounds needed:
- `[May 14]` AI Overview content present in HTML but missing/empty in JSON — **FIXED**
- `[May 15]` Missing link in references — **FIXED**
- `[May 6]` Not scraping full AI Overview content — **FIXED**
- `[May 6]` Missing `header_images` in AI Overviews — **FIXED**

One active known issue to handle gracefully:
- AIO only works for `hl=en` (English) with a limited range of `gl` country codes. Always pass `hl=en`. For Canadian clients, use `gl=ca`.

---

## What Claude Code Needs to Do

1. **Read this file first** before touching `lib/aiQuery.ts`
2. **Update `types/index.ts`** — add `aioFired`, `aioEligible`, `organicPosition`, `aioSuppressed` to `QueryResult`
3. **Update `lib/aiQuery.ts`** — replace the Google PSE provider block with SerpAPI two-call flow
4. **Update `.env.local.template`** — add `SERPAPI_KEY=`
5. **Update `ARCHITECTURE.md`** — replace "Google Programmable Search Engine API" with "SerpAPI (Google Search + AI Overview)" in the tech stack table; update the Google AIO approach section
6. **Do NOT touch** `scoreEngine.ts`, `fixListEngine.ts`, `reportBuilder.ts` — those consume `QueryResult[]` and only the new fields need to be accounted for there in a future session

---

## Claude Code Prompt (Paste This Exactly)

```
Read the file SerpAPI-Integration-Spec.md in the project root before doing anything.

Then do the following in order:

1. Update types/index.ts — add aioFired (boolean), aioEligible (boolean), organicPosition (number | null), aioSuppressed (boolean) to the QueryResult interface

2. Update lib/aiQuery.ts — replace the Google PSE / google_pse provider block with a SerpAPI two-call implementation. Use the pseudocode and field mapping in the spec exactly. Do not change any other provider (claude, perplexity, gemini). The function must handle all three SerpAPI response states: inline AIO, deferred AIO (page_token), and AIO absent/error.

3. Update .env.local.template — add SERPAPI_KEY= under the Google PSE section (replace or append)

4. Update ARCHITECTURE.md — in the Tech Stack table, replace the Google PSE row with: SerpAPI | Google Search + AI Overview API | Replaces PSE (deprecated Jan 2026). Update the Google AI Overviews Approach section to reflect two-call SerpAPI flow.

Do not touch scoreEngine.ts, fixListEngine.ts, reportBuilder.ts, or any other file.

After completing, run: git add -A && git commit -m "feat: replace Google PSE with SerpAPI two-call AIO integration"
```

---

*AnswerRank AI — Internal Spec. ICC / Alex Richinski. Do not share externally.*
