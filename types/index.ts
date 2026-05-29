// ─── Platform & Status Enums ────────────────────────────────────────────────

export type PlatformName = 'claude' | 'perplexity' | 'gemini' | 'serpapi_google'
export type SentimentValue = 'positive' | 'neutral' | 'negative' | 'not_mentioned'
export type ScanStatus = 'pending' | 'running' | 'complete' | 'failed'
export type SubscriptionTier = 'one_time' | 'monthly' | 'annual'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due'
export type FixImpactTag = 'High Impact' | 'Medium Impact' | 'Foundational'

// ─── Business ────────────────────────────────────────────────────────────────

export interface BusinessContext {
  name: string
  location: string
  industry: string
  competitors: Array<{ name: string; location: string }>
  /** Business's own domain (e.g. "example.com"); used to locate organic position in SerpAPI results. */
  domain?: string
}

// ─── AI Query Engine ─────────────────────────────────────────────────────────

export interface AIProvider {
  name: PlatformName
  query(prompt: string, business: BusinessContext): Promise<QueryResult>
}

export interface QueryResult {
  platform: PlatformName
  prompt: string
  response: string
  brandMentioned: boolean
  brandSentiment: SentimentValue
  competitorsMentioned: string[]
  citationUrls: string[]
  rawResponse: string
  runIndex: number
  /** SerpAPI/Google pillar: true when ai_overview returned text_blocks. Always false for non-Google platforms. */
  aioFired: boolean
  /** True when the AIO fired OR organic results were returned (query was valid/eligible). */
  aioEligible: boolean
  /** Position (1–10) of the brand's own domain in organic_results, or null if not found / not applicable. */
  organicPosition: number | null
  /** True when ai_overview is absent/errored — query type not eligible (not a content problem). */
  aioSuppressed: boolean
}

// ─── Score Engine ────────────────────────────────────────────────────────────

export interface ScoreComponents {
  /** Brand mention rate — 35% weight */
  mentionRate: number
  /** Citation source rate — 20% weight */
  citationRate: number
  /** Weighted sentiment average — 20% weight */
  sentimentScore: number
  /** Platforms with at least one mention / 4 — 15% weight */
  platformCoverage: number
  /** Inverse competitor mention rate — 10% weight */
  competitorDisplacement: number
}

export interface ScoreBreakdown {
  overall: number // 0–100, integer
  components: ScoreComponents
  platformScores: Record<PlatformName, number>
}

// ─── Fix List ────────────────────────────────────────────────────────────────

export interface FixItem {
  priority: number
  tag: FixImpactTag
  title: string
  why: string
  failureMode: string
}

// ─── Report ──────────────────────────────────────────────────────────────────

export interface CompetitorData {
  name: string
  location: string
  score: number
  platformScores: Record<PlatformName, number>
}

export interface SentimentData {
  platform: PlatformName
  positive: number // ratio 0–1
  neutral: number
  negative: number
}

export interface CitationSource {
  url: string
  platform: PlatformName
  count: number
}

export interface ReportData {
  scanId: string
  userId: string
  businessId: string
  overallScore: number
  platformScores: Record<PlatformName, number>
  scoreComponents: ScoreComponents
  competitorData: CompetitorData[]
  sentimentData: SentimentData[]
  citationSources: CitationSource[]
  fixItems: FixItem[]
  rawResults: QueryResult[]
}

// ─── Database Row Types (match Supabase schema) ───────────────────────────────

export interface BusinessRow {
  id: string
  user_id: string
  name: string
  location: string
  industry: string
  competitors: Array<{ name: string; location: string }>
  created_at: string
}

export interface ScanRow {
  id: string
  business_id: string
  user_id: string
  status: ScanStatus
  stripe_session_id: string | null
  tier: SubscriptionTier
  triggered_at: string
  completed_at: string | null
}

export interface ReportRow {
  id: string
  scan_id: string
  user_id: string
  overall_score: number
  platform_scores: Record<PlatformName, number>
  competitor_data: CompetitorData[]
  sentiment_data: SentimentData[]
  citation_sources: CitationSource[]
  fix_items: FixItem[]
  raw_results: QueryResult[]
  created_at: string
}

export interface FixItemRow {
  id: string
  report_id: string
  priority: number
  tag: FixImpactTag
  title: string
  why: string
  failure_mode: string
}

export interface SubscriptionRow {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  tier: 'monthly' | 'annual'
  status: SubscriptionStatus
  current_period_end: string
  created_at: string
}
