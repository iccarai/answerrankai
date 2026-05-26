import { SupabaseClient } from '@supabase/supabase-js'
import { runScan } from '@/lib/aiQuery'
import { calculateScore } from '@/lib/scoreEngine'
import { generateFixList } from '@/lib/fixListEngine'
import { assembleReport } from '@/lib/reportBuilder'
import type { BusinessContext } from '@/types'

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

    // 5. Insert report
    const { data: report, error: reportError } = await params.adminClient
      .from('reports')
      .insert(reportData)
      .select()
      .single()

    if (reportError) throw reportError
    if (!report) throw new Error('Failed to retrieve inserted report')

    // 6. Insert fix items (with report_id)
    const fixItemsWithReportId = fixItems.map((item) => ({
      ...item,
      report_id: report.id,
    }))

    const { error: fixError } = await params.adminClient
      .from('fix_items')
      .insert(fixItemsWithReportId)

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
