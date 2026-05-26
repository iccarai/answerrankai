import type { PlatformName, QueryResult, ScoreBreakdown, ScoreComponents } from '@/types'

// ─── Weights (must sum to 1.0) ────────────────────────────────────────────────

const WEIGHTS = {
  mentionRate: 0.35,
  citationRate: 0.20,
  sentimentScore: 0.20,
  platformCoverage: 0.15,
  competitorDisplacement: 0.10,
} as const satisfies Record<keyof ScoreComponents, number>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

// ─── Component Calculations ───────────────────────────────────────────────────

/** (mentions / total_queries) × 100 */
function calcMentionRate(results: QueryResult[]): number {
  if (results.length === 0) return 0
  const mentions = results.filter(r => r.brandMentioned).length
  return (mentions / results.length) * 100
}

/**
 * (cited_as_source / total_queries) × 100
 * A result counts as "cited as source" when the brand is mentioned AND
 * the response includes at least one citation URL.
 */
function calcCitationRate(results: QueryResult[]): number {
  if (results.length === 0) return 0
  const cited = results.filter(r => r.brandMentioned && r.citationUrls.length > 0).length
  return (cited / results.length) * 100
}

/**
 * Weighted average of sentiment values:
 *   positive → 1.0, neutral → 0.5, negative → 0.0
 * Only counts results where the brand was mentioned.
 */
function calcSentimentScore(results: QueryResult[]): number {
  const mentioned = results.filter(r => r.brandMentioned)
  if (mentioned.length === 0) return 0

  const sentimentWeight = { positive: 1, neutral: 0.5, negative: 0, not_mentioned: 0 } as const
  const total = mentioned.reduce((sum, r) => sum + sentimentWeight[r.brandSentiment], 0)
  return (total / mentioned.length) * 100
}

/** (platforms_with_at_least_one_mention / 4) × 100 */
function calcPlatformCoverage(results: QueryResult[]): number {
  const mentioningPlatforms = new Set(
    results.filter(r => r.brandMentioned).map(r => r.platform)
  )
  return (mentioningPlatforms.size / 4) * 100
}

/**
 * Inverse competitor mention rate:
 *   (1 - competitor_mention_rate) × 100
 * A result "has competitor" when any competitor is mentioned.
 */
function calcCompetitorDisplacement(results: QueryResult[]): number {
  if (results.length === 0) return 100
  const withCompetitor = results.filter(r => r.competitorsMentioned.length > 0).length
  return (1 - withCompetitor / results.length) * 100
}

// ─── Per-Platform Scores ──────────────────────────────────────────────────────

function calcPlatformScores(results: QueryResult[]): Record<PlatformName, number> {
  const platforms: PlatformName[] = ['claude', 'perplexity', 'gemini', 'google_pse']

  return Object.fromEntries(
    platforms.map(platform => {
      const pr = results.filter(r => r.platform === platform)
      if (pr.length === 0) return [platform, 0]

      // Simplified per-platform score: mention rate (60%) + sentiment (40%)
      const mention = calcMentionRate(pr)
      const sentiment = calcSentimentScore(pr)
      return [platform, clamp(Math.round(mention * 0.6 + sentiment * 0.4))]
    })
  ) as Record<PlatformName, number>
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function calculateScore(results: QueryResult[]): ScoreBreakdown {
  const components: ScoreComponents = {
    mentionRate: clamp(calcMentionRate(results)),
    citationRate: clamp(calcCitationRate(results)),
    sentimentScore: clamp(calcSentimentScore(results)),
    platformCoverage: clamp(calcPlatformCoverage(results)),
    competitorDisplacement: clamp(calcCompetitorDisplacement(results)),
  }

  const overall = clamp(
    Math.round(
      components.mentionRate * WEIGHTS.mentionRate +
      components.citationRate * WEIGHTS.citationRate +
      components.sentimentScore * WEIGHTS.sentimentScore +
      components.platformCoverage * WEIGHTS.platformCoverage +
      components.competitorDisplacement * WEIGHTS.competitorDisplacement
    )
  )

  return {
    overall,
    components,
    platformScores: calcPlatformScores(results),
  }
}
