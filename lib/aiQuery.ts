import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIProvider, BusinessContext, PlatformName, QueryResult } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const RUNS_PER_PROMPT = 3
const PROMPTS_PER_PLATFORM = 15
const PROMPT_DELAY_MS = 500

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function buildPrompts(business: BusinessContext): string[] {
  const { name, location, industry } = business

  return [
    `What are the best ${industry} businesses in ${location}?`,
    `Who is ${name} and what do they offer in ${location}?`,
    `Can you recommend a ${industry} professional in ${location}?`,
    `What ${industry} services are available in ${location}?`,
    `Who are the top-rated ${industry} providers near ${location}?`,
    `I need a ${industry} specialist in ${location}. Who should I contact?`,
    `What do people say about ${industry} services in ${location}?`,
    `Which ${industry} businesses in ${location} have the best reviews?`,
    `How do I find a trusted ${industry} provider in ${location}?`,
    `Tell me about ${industry} options in ${location}.`,
    `What are customers saying about ${industry} in ${location}?`,
    `If someone in ${location} needs ${industry} help, what are their options?`,
    `Who provides ${industry} services in ${location} and what makes them stand out?`,
    `What should I look for when choosing a ${industry} provider in ${location}?`,
    `Are there any well-known ${industry} providers in ${location}?`,
  ].slice(0, PROMPTS_PER_PLATFORM)
}

// ─── Response Parsers ────────────────────────────────────────────────────────

function detectMention(text: string, businessName: string): boolean {
  return text.toLowerCase().includes(businessName.toLowerCase())
}

function detectSentiment(text: string, businessName: string): QueryResult['brandSentiment'] {
  if (!detectMention(text, businessName)) return 'not_mentioned'

  const lower = text.toLowerCase()
  const nameIdx = lower.indexOf(businessName.toLowerCase())
  // Examine ±150 chars around the mention for sentiment signals
  const context = lower.slice(Math.max(0, nameIdx - 150), nameIdx + 200)

  const positiveWords = [
    'best', 'excellent', 'highly rated', 'recommended', 'trusted',
    'top', 'great', 'outstanding', 'leading', 'award', 'renowned',
    'reputable', 'exceptional', 'premier',
  ]
  const negativeWords = [
    'avoid', 'poor', 'bad', 'negative', 'complaint', 'worst',
    'unreliable', 'scam', 'terrible', 'disappointing', 'unprofessional',
  ]

  const posCount = positiveWords.filter(w => context.includes(w)).length
  const negCount = negativeWords.filter(w => context.includes(w)).length

  if (negCount > posCount) return 'negative'
  if (posCount > 0) return 'positive'
  return 'neutral'
}

function detectCompetitors(text: string, competitors: BusinessContext['competitors']): string[] {
  return competitors
    .filter(c => text.toLowerCase().includes(c.name.toLowerCase()))
    .map(c => c.name)
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s)"']+/g
  return text.match(urlRegex) ?? []
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function makeResult(
  platform: PlatformName,
  prompt: string,
  response: string,
  rawResponse: string,
  business: BusinessContext,
  runIndex: number,
  citationUrls?: string[]
): QueryResult {
  return {
    platform,
    prompt,
    response,
    brandMentioned: detectMention(response, business.name),
    brandSentiment: detectSentiment(response, business.name),
    competitorsMentioned: detectCompetitors(response, business.competitors),
    citationUrls: citationUrls ?? extractUrls(response),
    rawResponse,
    runIndex,
    // AIO fields are Google-pillar specific; non-Google providers default them.
    aioFired: false,
    aioEligible: false,
    organicPosition: null,
    aioSuppressed: false,
  }
}

// ─── Claude Provider ─────────────────────────────────────────────────────────

class ClaudeProvider implements AIProvider {
  readonly name: PlatformName = 'claude'
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }

  async query(prompt: string, business: BusinessContext): Promise<QueryResult> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const response = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    return makeResult('claude', prompt, response, response, business, 0)
  }
}

// ─── Perplexity Provider ──────────────────────────────────────────────────────

interface PerplexityResponse {
  choices: Array<{ message: { content: string } }>
  citations?: string[]
}

class PerplexityProvider implements AIProvider {
  readonly name: PlatformName = 'perplexity'

  async query(prompt: string, business: BusinessContext): Promise<QueryResult> {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-medium-online',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) throw new Error(`Perplexity API error: ${res.status} ${res.statusText}`)

    const data = (await res.json()) as PerplexityResponse
    const response = data.choices[0]?.message?.content ?? ''
    const citationUrls = data.citations ?? extractUrls(response)

    return makeResult('perplexity', prompt, response, JSON.stringify(data), business, 0, citationUrls)
  }
}

// ─── Gemini Provider ──────────────────────────────────────────────────────────

class GeminiProvider implements AIProvider {
  readonly name: PlatformName = 'gemini'
  private model: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']>

  constructor() {
    const ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
    this.model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })
  }

  async query(prompt: string, business: BusinessContext): Promise<QueryResult> {
    const result = await this.model.generateContent(prompt)
    const response = result.response.text()

    return makeResult('gemini', prompt, response, response, business, 0)
  }
}

// ─── SerpAPI Google Provider (Google AI Overviews) ───────────────────────────
// Replaces the deprecated Programmable Search Engine (PSE retired for new engines
// Jan 20, 2026). Two-call flow per SerpAPI spec:
//   Call 1 — engine=google: returns ai_overview inline (State A), a page_token for
//            a deferred fetch (State B), or nothing/error (State C).
//   Call 2 — engine=google_ai_overview: only when a page_token is present. The
//            token expires within ~1 minute, so it is fired immediately.
// The platform identifier is 'serpapi_google' (Google PSE fully removed). The
// user-facing label is "Google AI Overviews".

interface SerpApiReference {
  title?: string
  link?: string
  snippet?: string
  source?: string
  index?: number
}

interface SerpApiTextBlock {
  type?: string
  snippet?: string
  title?: string
  subtitle?: string
  formatted?: string
  list?: SerpApiTextBlock[]
  text_blocks?: SerpApiTextBlock[]
}

interface SerpApiAIOverview {
  text_blocks?: SerpApiTextBlock[]
  references?: SerpApiReference[]
  page_token?: string
  serpapi_link?: string
  error?: string
}

interface SerpApiOrganicResult {
  position?: number
  title?: string
  link?: string
  snippet?: string
  domain?: string
}

interface SerpApiSearchResponse {
  ai_overview?: SerpApiAIOverview
  organic_results?: SerpApiOrganicResult[]
}

/** Recursively walks text_blocks (incl. nested list[] and expandable text_blocks[]) collecting readable text. */
function collectSnippets(blocks: SerpApiTextBlock[]): string {
  const parts: string[] = []
  for (const block of blocks) {
    if (block.snippet) parts.push(block.snippet)
    if (block.title) parts.push(block.title)
    if (block.subtitle) parts.push(block.subtitle)
    if (block.formatted) parts.push(block.formatted)
    if (Array.isArray(block.list)) parts.push(collectSnippets(block.list))
    if (Array.isArray(block.text_blocks)) parts.push(collectSnippets(block.text_blocks))
  }
  return parts.filter(Boolean).join(' ')
}

/** Flattens reference title/source/link/snippet into one searchable string. */
function referenceText(references: SerpApiReference[]): string {
  return references
    .map(r => [r.title, r.source, r.link, r.snippet].filter(Boolean).join(' '))
    .join(' ')
}

/** Finds the 1-based position of the brand's own domain within organic_results, or null. */
function findOrganicPosition(
  domain: string | undefined,
  organic: SerpApiOrganicResult[]
): number | null {
  if (!domain) return null
  const needle = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')
  if (!needle) return null
  for (const r of organic) {
    const hay = (r.domain ?? r.link ?? '').toLowerCase()
    if (hay.includes(needle)) return r.position ?? null
  }
  return null
}

class SerpApiGoogleProvider implements AIProvider {
  readonly name: PlatformName = 'serpapi_google'

  async query(prompt: string, business: BusinessContext): Promise<QueryResult> {
    const apiKey = process.env.SERPAPI_KEY!

    // Call 1 — Google Search. AIO only works for hl=en with limited gl codes.
    const call1Params = new URLSearchParams({
      engine: 'google',
      q: prompt,
      api_key: apiKey,
      hl: 'en',
      gl: 'us',
    })
    const res1 = await fetch(`https://serpapi.com/search.json?${call1Params}`)
    if (!res1.ok) throw new Error(`SerpAPI search error: ${res1.status} ${res1.statusText}`)
    const data1 = (await res1.json()) as SerpApiSearchResponse

    let aioData: SerpApiAIOverview | null = data1.ai_overview ?? null

    // State B — deferred. page_token expires within ~1 minute; fire immediately.
    if (aioData?.page_token) {
      try {
        const call2Params = new URLSearchParams({
          engine: 'google_ai_overview',
          page_token: aioData.page_token,
          api_key: apiKey,
        })
        const res2 = await fetch(`https://serpapi.com/search.json?${call2Params}`)
        aioData = res2.ok
          ? ((await res2.json()) as SerpApiSearchResponse).ai_overview ?? null
          : null
      } catch {
        aioData = null
      }
    }

    // Determine AIO state.
    const textBlocks = aioData?.text_blocks ?? []
    const references = aioData?.references ?? []
    const organicResults = data1.organic_results ?? []

    let aioFired = false
    let aioSuppressed = false
    if (textBlocks.length > 0) {
      aioFired = true // State A
    } else if (!aioData || aioData.error) {
      aioSuppressed = true // State C — query type not eligible
    }

    // Field extraction (per spec mapping table).
    const snippetText = collectSnippets(textBlocks)
    const combinedText = `${snippetText} ${referenceText(references)}`.trim()

    const brandMentioned = detectMention(combinedText, business.name)
    const brandSentiment = detectSentiment(snippetText, business.name)
    const competitorsMentioned = detectCompetitors(combinedText, business.competitors)
    const citationUrls = references
      .map(r => r.link)
      .filter((link): link is string => Boolean(link))
    const organicPosition = findOrganicPosition(business.domain, organicResults)
    const response = snippetText.trim() || organicResults[0]?.snippet || ''

    return {
      platform: 'serpapi_google',
      prompt,
      response,
      brandMentioned,
      brandSentiment,
      competitorsMentioned,
      citationUrls,
      rawResponse: JSON.stringify(aioData ?? organicResults.slice(0, 3)),
      runIndex: 0,
      aioFired,
      aioEligible: aioFired || organicResults.length > 0,
      organicPosition,
      aioSuppressed,
    }
  }
}

// ─── Platform Runner (sequential within, parallel across) ────────────────────

export type ScanProgressCallback = (
  platform: PlatformName,
  completed: number,
  total: number
) => void

async function runPlatform(
  provider: AIProvider,
  business: BusinessContext,
  onProgress?: ScanProgressCallback
): Promise<QueryResult[]> {
  const prompts = buildPrompts(business)
  const results: QueryResult[] = []
  const total = prompts.length * RUNS_PER_PROMPT

  for (const prompt of prompts) {
    for (let runIndex = 0; runIndex < RUNS_PER_PROMPT; runIndex++) {
      const result = await provider.query(prompt, business)
      results.push({ ...result, runIndex })
      onProgress?.(provider.name, results.length, total)
      if (runIndex < RUNS_PER_PROMPT - 1) await sleep(PROMPT_DELAY_MS)
    }
  }

  return results
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Runs all 4 providers in parallel. Within each provider, prompts run
 * sequentially with RUNS_PER_PROMPT repetitions each.
 *
 * Failed providers are logged and excluded (Promise.allSettled — never throws).
 * Expected total: 15 prompts × 3 runs × 4 platforms = 180 API calls.
 * Estimated wall-clock time: 60–120 seconds.
 */
export async function runScan(
  business: BusinessContext,
  onProgress?: ScanProgressCallback
): Promise<QueryResult[]> {
  const providers: AIProvider[] = [
    new ClaudeProvider(),
    new PerplexityProvider(),
    new GeminiProvider(),
    new SerpApiGoogleProvider(),
  ]

  const settled = await Promise.allSettled(
    providers.map(p => runPlatform(p, business, onProgress))
  )

  const allResults: QueryResult[] = []

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      allResults.push(...outcome.value)
    } else {
      console.error('[aiQuery] Platform scan failed:', outcome.reason)
    }
  }

  return allResults
}
