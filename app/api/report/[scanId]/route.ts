export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const { scanId } = params

    // Authenticate user
    const supabase = createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch report (RLS will enforce user_id match)
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('scan_id', scanId)
      .eq('user_id', user.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Fetch fix items
    const { data: fixItems, error: fixError } = await supabase
      .from('fix_items')
      .select('*')
      .eq('report_id', report.id)
      .order('priority', { ascending: true })

    if (fixError) {
      console.error('Error fetching fix items:', fixError)
      return NextResponse.json(
        { error: 'Failed to fetch fix items' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        scanId: report.scan_id,
        userId: report.user_id,
        businessId: report.business_id,
        overallScore: report.overall_score,
        platformScores: report.platform_scores,
        scoreComponents: report.score_components,
        competitorData: report.competitor_data,
        sentimentData: report.sentiment_data,
        citationSources: report.citation_sources,
        fixItems: (fixItems || []).map((item) => ({
          priority: item.priority,
          tag: item.tag,
          title: item.title,
          why: item.why,
          failureMode: item.failure_mode,
        })),
        rawResults: report.raw_results,
      },
    })
  } catch (error) {
    console.error('[GET /api/report/[scanId]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
