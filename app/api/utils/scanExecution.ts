import { SupabaseClient } from '@supabase/supabase-js'
import { runScan } from '@/lib/aiQuery'
import { calculateScore } from '@/lib/scoreEngine'
import { generateFixList } from '@/lib/fixListEngine'
import { assembleReport } from '@/lib/reportBuilder'
import type { BusinessContext, FixItem, ReportData } from '@/types'

// ─── DB column mappers (camelCase ReportData/FixItem → snake_case columns) ─────
// The reports/fix_items tables use snake_case. Map explicitly at the DB boundary;
// note `fixItems` is NOT a column on `reports` (it inserts into `fix_items`).

function toReportRow(report: ReportData) {
  return {
    scan_id: report.scanId,
    user_id: report.userId,
    business_id: report.businessId,
    overall_score: report.overallScore,
    platform_scores: report.platformScores,
    score_components: report.scoreComponents,
    competitor_data: report.competitorData,
    sentiment_data: report.sentimentData,
    citation_sources: report.citationSources,
    raw_results: report.rawResults,
  }
}

function toFixItemRow(item: FixItem, reportId: string) {
  return {
    report_id: reportId,
    priority: item.priority,
    tag: item.tag,
    title: item.title,
    why: item.why,
    failure_mode: item.failureMode,
  }
}

export async function executeScan(params: {
  scanId: string
  userId: string
  businessId: string
  business: BusinessContext
  adminClient: SupabaseClient
}) {
  try {
    // 1. Query AI platforms (hybrid parallel execution)
    const results = await runScan(params.business)

    // 2. Calculate score
    const scoreBreakdown = calculateScore(results)

    // 3. Generate fixes
    const fixItems = generateFixList(scoreBreakdown)

    // 4. Assemble report
    const reportData = assembleReport({
      scanId: params.scanId,
      userId: params.userId,
      businessId: params.businessId,
      business: params.business,
      results,
      scoreBreakdown,
      fixItems,
    })

    // 5. Insert report (map camelCase ReportData → snake_case columns)
    const { data: report, error: reportError } = await params.adminClient
      .from('reports')
      .insert(toReportRow(reportData))
      .select()
      .single()

    if (reportError) throw reportError
    if (!report) throw new Error('Failed to retrieve inserted report')

    // 6. Insert fix items (with report_id, mapped to snake_case columns)
    const fixItemRows = fixItems.map((item) => toFixItemRow(item, report.id))

    const { error: fixError } = await params.adminClient
      .from('fix_items')
      .insert(fixItemRows)

    if (fixError) throw fixError

    // 7. Mark scan complete
    const { error: scanError } = await params.adminClient
      .from('scans')
      .update({
        status: 'complete',
        completed_at: new Date().toISOString(),
      })
      .eq('id', params.scanId)

    if (scanError) throw scanError

    return { success: true, reportId: report.id }
  } catch (error) {
    console.error(`[Scan ${params.scanId}] Execution failed:`, error)

    try {
      // Mark scan failed
      await params.adminClient
        .from('scans')
        .update({ status: 'failed' })
        .eq('id', params.scanId)
    } catch (updateError) {
      console.error(
        `[Scan ${params.scanId}] Failed to mark scan as failed:`,
        updateError
      )
    }

    return { success: false, error: String(error) }
  }
}
