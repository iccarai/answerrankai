import type {
  BusinessContext,
  CitationSource,
  CompetitorData,
  FixItem,
  PlatformName,
  QueryResult,
  ReportData,
  ScoreBreakdown,
  SentimentData,
} from '@/types'

// ─── Internal Builders ────────────────────────────────────────────────────────

function buildCompetitorData(
  results: QueryResult[],
  business: BusinessContext
): CompetitorData[] {
  const platforms: PlatformName[] = ['claude', 'perplexity', 'gemini', 'google_pse']

  return business.competitors.map(competitor => {
    const platformScores = Object.fromEntries(
      platforms.map(platform => {
        const pr = results.filter(r => r.platform === platform)
        if (pr.length === 0) return [platform, 0]
        const mentioned = pr.filter(r =>
          r.competitorsMentioned.includes(competitor.name)
        ).length
        return [platform, Math.round((mentioned / pr.length) * 100)]
      })
    ) as Record<PlatformName, number>

    const totalMentioned = results.filter(r =>
      r.competitorsMentioned.includes(competitor.name)
    ).length
    const score = results.length > 0
      ? Math.round((totalMentioned / results.length) * 100)
      : 0

    return {
      name: competitor.name,
      location: competitor.location,
      score,
      platformScores,
    }
  })
}

function buildSentimentData(results: QueryResult[]): SentimentData[] {
  const platforms: PlatformName[] = ['claude', 'perplexity', 'gemini', 'google_pse']

  return platforms.map(platform => {
    const mentioned = results.filter(
      r => r.platform === platform && r.brandMentioned
    )

    if (mentioned.length === 0) {
      return { platform, positive: 0, neutral: 0, negative: 0 }
    }

    const total = mentioned.length
    return {
      platform,
      positive: mentioned.filter(r => r.brandSentiment === 'positive').length / total,
      neutral:  mentioned.filter(r => r.brandSentiment === 'neutral').length  / total,
      negative: mentioned.filter(r => r.brandSentiment === 'negative').length / total,
    }
  })
}

function buildCitationSources(results: QueryResult[]): CitationSource[] {
  const urlMap = new Map<string, { platform: PlatformName; count: number }>()

  for (const result of results) {
    for (const url of result.citationUrls) {
      const existing = urlMap.get(url)
      if (existing) {
        existing.count++
      } else {
        urlMap.set(url, { platform: result.platform, count: 1 })
      }
    }
  }

  return Array.from(urlMap.entries())
    .map(([url, { platform, count }]) => ({ url, platform, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface AssembleReportParams {
  scanId: string
  userId: string
  businessId: string
  business: BusinessContext
  results: QueryResult[]
  scoreBreakdown: ScoreBreakdown
  fixItems: FixItem[]
}

export function assembleReport({
  scanId,
  userId,
  businessId,
  business,
  results,
  scoreBreakdown,
  fixItems,
}: AssembleReportParams): ReportData {
  return {
    scanId,
    userId,
    businessId,
    overallScore: scoreBreakdown.overall,
    platformScores: scoreBreakdown.platformScores,
    scoreComponents: scoreBreakdown.components,
    competitorData: buildCompetitorData(results, business),
    sentimentData: buildSentimentData(results),
    citationSources: buildCitationSources(results),
    fixItems,
    rawResults: results,
  }
}
