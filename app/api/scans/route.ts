import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch scans with business info (RLS enforces user_id)
    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select(
        `
        id,
        status,
        tier,
        triggered_at,
        completed_at,
        business_id,
        businesses!inner(name, location, industry)
      `
      )
      .eq('user_id', user.id)
      .order('triggered_at', { ascending: false })

    if (scansError) {
      console.error('Error fetching scans:', scansError)
      return NextResponse.json(
        { error: 'Failed to fetch scans' },
        { status: 500 }
      )
    }

    // Fetch overall scores for completed scans
    const scanIds = scans?.map((s) => s.id) || []
    let scoreMap: Record<string, number> = {}

    if (scanIds.length > 0) {
      const { data: reports } = await supabase
        .from('reports')
        .select('scan_id, overall_score')
        .in('scan_id', scanIds)

      if (reports) {
        reports.forEach((r) => {
          scoreMap[r.scan_id] = r.overall_score
        })
      }
    }

    // Transform response
    const transformedScans = (scans || []).map((scan) => ({
      id: scan.id,
      businessId: scan.business_id,
      businessName: (scan.businesses as any)?.name || 'Unknown',
      location: (scan.businesses as any)?.location || '',
      industry: (scan.businesses as any)?.industry || '',
      status: scan.status,
      tier: scan.tier,
      triggeredAt: scan.triggered_at,
      completedAt: scan.completed_at,
      overallScore: scoreMap[scan.id] || undefined,
    }))

    return NextResponse.json({
      success: true,
      data: transformedScans,
    })
  } catch (error) {
    console.error('[GET /api/scans] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
