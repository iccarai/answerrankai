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

// ─── Google PSE Provider ──────────────────────────────────────────────────────
// Labeled as "Google Search Visibility" in the report — uses the Programmable Search
// Engine API as a stable proxy for Google AI Overview signals (no scraping).

interface PSEItem {
  title: string
  snippet: string
  link: string
}

interface PSEResponse {
  items?: PSEItem[]
}

class GooglePSEProvider implements AIProvider {
  readonly name: PlatformName = 'google_pse'

  async query(prompt: string, business: BusinessContext): Promise<QueryResult> {
    const params = new URLSearchParams({
      key: process.env.GOOGLE_PSE_API_KEY!,
      cx: process.env.GOOGLE_PSE_ENGINE_ID!,
      q: prompt,
      num: '10',
    })

    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`)
    if (!res.ok) throw new Error(`Google PSE API error: ${res.status} ${res.statusText}`)

    const data = (await res.json()) as PSEResponse
    const items = data.items ?? []

    // AIO source zone = positions 1–5; brand mention = appearing there
    const businessInAIOZone = items.slice(0, 5).some(
      item =>
        item.title.toLowerCase().includes(business.name.toLowerCase()) ||
        item.snippet.toLowerCase().includes(business.name.toLowerCase())
    )

    const combinedText = items.map(i => `${i.title} ${i.snippet}`).join(' ')
    const citationUrls = items.map(i => i.link)

    return {
      platform: 'google_pse',
      prompt,
      response: combinedText,
      brandMentioned: businessInAIOZone,
      brandSentiment: detectSentiment(combinedText, business.name),
      competitorsMentioned: detectCompetitors(combinedText, business.competitors),
      citationUrls,
      rawResponse: JSON.stringify(data),
      runIndex: 0,
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
    new GooglePSEProvider(),
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
