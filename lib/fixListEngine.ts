import type { FixImpactTag, FixItem, ScoreBreakdown } from '@/types'

// ─── Fix Rules ────────────────────────────────────────────────────────────────

interface FixRule {
  failureMode: string
  condition: (b: ScoreBreakdown) => boolean
  tag: FixImpactTag
  title: string
  why: string
}

const FIX_RULES: FixRule[] = [
  // ── Mention Rate ──────────────────────────────────────────────────────────
  {
    failureMode: 'low_mention_rate_gbp',
    condition: b => b.components.mentionRate < 40,
    tag: 'High Impact',
    title: 'Claim and fully optimize your Google Business Profile',
    why: "AI platforms pull heavily from Google's index. A complete GBP — accurate hours, services, photos, and weekly posts — is the single fastest way to increase your mention rate across all four AI platforms.",
  },
  {
    failureMode: 'low_mention_rate_directories',
    condition: b => b.components.mentionRate < 55,
    tag: 'High Impact',
    title: 'List your business in the top 10 industry-specific directories',
    why: 'AI models learn from indexed web data. Consistent NAP (Name, Address, Phone) citations across directories increase your mention frequency on ChatGPT, Perplexity, and Gemini.',
  },

  // ── Citation Rate ─────────────────────────────────────────────────────────
  {
    failureMode: 'low_citation_rate_content',
    condition: b => b.components.citationRate < 30,
    tag: 'High Impact',
    title: 'Publish one authoritative "definitive guide" on your core service',
    why: 'Perplexity and Google AI Overview cite specific URLs. Long-form, expert-authored content earns these citations. A single well-optimized guide can become the AI\'s go-to source for your category.',
  },
  {
    failureMode: 'low_citation_rate_pr',
    condition: b => b.components.citationRate < 50,
    tag: 'Medium Impact',
    title: 'Get quoted as an expert in 3 local or industry publications',
    why: 'Third-party citations from credible publications signal authority to AI systems. Perplexity and Google AIO specifically pull from news and journal sources — a single placement can lift your citation rate significantly.',
  },

  // ── Sentiment ─────────────────────────────────────────────────────────────
  {
    failureMode: 'low_sentiment_reviews',
    condition: b => b.components.sentimentScore < 50,
    tag: 'High Impact',
    title: 'Launch a systematic review generation campaign',
    why: 'AI responses reflect aggregate sentiment from reviews. Businesses with 50+ recent positive reviews are described more favorably by all four AI platforms. Even 10 new reviews in the next 30 days will shift your sentiment score.',
  },
  {
    failureMode: 'negative_sentiment_response',
    condition: b => b.components.sentimentScore < 30,
    tag: 'High Impact',
    title: 'Respond to all negative reviews and resolve outstanding complaints',
    why: 'AI models are sensitive to patterns of unresolved negative feedback. Unanswered negative reviews suppress your brand sentiment across every platform that indexes review data.',
  },

  // ── Platform Coverage ─────────────────────────────────────────────────────
  {
    failureMode: 'low_platform_coverage_entity',
    condition: b => b.components.platformCoverage < 50,
    tag: 'Medium Impact',
    title: 'Create a structured "About" page using entity-rich language',
    why: "Encyclopedic content with clear entity definitions — who you are, what you do, where you operate, and who you serve — dramatically improves visibility on ChatGPT and Gemini, which rely on entity graphs rather than keyword search.",
  },
  {
    failureMode: 'low_platform_coverage_schema',
    condition: b => b.components.platformCoverage < 75,
    tag: 'Foundational',
    title: 'Add LocalBusiness schema markup to your website',
    why: 'Schema markup makes your business machine-readable. Google AI Overview and Gemini use structured data to identify and surface local businesses. Without it, you are invisible to the structured-data layer of these platforms.',
  },

  // ── Competitor Displacement ───────────────────────────────────────────────
  {
    failureMode: 'competitor_displacement_comparison',
    condition: b => b.components.competitorDisplacement < 40,
    tag: 'High Impact',
    title: 'Create a direct comparison page: [Your Business] vs [Top Competitor]',
    why: 'AI models frequently mention competitors by name when answering recommendation queries. A well-optimized comparison page gets you mentioned alongside — and often ranked above — your top competitors in AI-generated answers.',
  },
  {
    failureMode: 'competitor_displacement_content',
    condition: b => b.components.competitorDisplacement < 65,
    tag: 'Medium Impact',
    title: 'Publish content targeting the exact queries where competitors dominate',
    why: 'Your scan identified specific query types where competitors appear and you do not. Content aligned to these prompts shifts AI responses in your favor within 60–90 days.',
  },

  // ── Foundational ──────────────────────────────────────────────────────────
  {
    failureMode: 'foundational_performance',
    condition: b => b.overall < 50,
    tag: 'Foundational',
    title: 'Ensure your website loads in under 2 seconds and is mobile-optimized',
    why: 'AI platforms weight page speed and mobile-friendliness when selecting citation sources. A slow or mobile-broken site is systematically excluded from AI-generated answers regardless of content quality.',
  },
  {
    failureMode: 'foundational_nap',
    condition: b => b.overall < 70,
    tag: 'Foundational',
    title: 'Audit and correct all NAP inconsistencies across the web',
    why: 'Name, Address, Phone mismatches confuse AI systems about your business identity. A single inconsistency can suppress your mentions across all four platforms until it is resolved.',
  },
]

// ─── Tag Priority ─────────────────────────────────────────────────────────────

const TAG_ORDER: Record<FixImpactTag, number> = {
  'High Impact': 0,
  'Medium Impact': 1,
  'Foundational': 2,
}

// ─── Public API ───────────────────────────────────────────────────────────────

const MAX_FIX_ITEMS = 10

export function generateFixList(breakdown: ScoreBreakdown): FixItem[] {
  return FIX_RULES
    .filter(rule => rule.condition(breakdown))
    .sort((a, b) => TAG_ORDER[a.tag] - TAG_ORDER[b.tag])
    .slice(0, MAX_FIX_ITEMS)
    .map((rule, i) => ({
      priority: i + 1,
      tag: rule.tag,
      title: rule.title,
      why: rule.why,
      failureMode: rule.failureMode,
    }))
}
