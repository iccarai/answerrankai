export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { executeScan } from '@/app/api/utils/scanExecution'
import type { BusinessContext } from '@/types'

export async function POST(req: NextRequest) {
  // Verify Vercel Cron authorization
  const authHeader = headers().get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const scansInitiated: string[] = []
  const scansCompleted: string[] = []
  const errors: Array<{ scanId: string; reason: string }> = []

  try {
    // Query active DFY subscriptions
    const { data: subscriptions, error: subsError } = await adminClient
      .from('subscriptions')
      .select('user_id, stripe_subscription_id')
      .eq('tier', 'dfy')
      .eq('status', 'active')

    if (subsError) {
      console.error('Failed to fetch subscriptions:', subsError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active DFY subscriptions found')
      return NextResponse.json({
        success: true,
        data: {
          scansInitiated: 0,
          scansCompleted: 0,
          errors: [],
        },
      })
    }

    // For each subscription, create and run a rescan
    for (const sub of subscriptions) {
      try {
        // Fetch user's most recent business
        const { data: businesses, error: bizError } = await adminClient
          .from('businesses')
          .select('*')
          .eq('user_id', sub.user_id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (bizError || !businesses || businesses.length === 0) {
          errors.push({
            scanId: sub.stripe_subscription_id,
            reason: 'No business found for user',
          })
          continue
        }

        const business = businesses[0]

        // Create new scan record
        const { data: newScan, error: scanError } = await adminClient
          .from('scans')
          .insert({
            user_id: sub.user_id,
            business_id: business.id,
            status: 'pending',
            tier: 'monthly',
          })
          .select()
          .single()

        if (scanError || !newScan) {
          errors.push({
            scanId: sub.stripe_subscription_id,
            reason: 'Failed to create scan',
          })
          continue
        }

        scansInitiated.push(newScan.id)

        // Build business context
        const businessContext: BusinessContext = {
          name: business.name,
          location: business.location,
          industry: business.industry,
          competitors: business.competitors || [],
        }

        // Execute scan
        const result = await executeScan({
          scanId: newScan.id,
          userId: sub.user_id,
          businessId: business.id,
          business: businessContext,
          adminClient,
        })

        if (result.success) {
          scansCompleted.push(newScan.id)
        } else {
          errors.push({
            scanId: newScan.id,
            reason: result.error || 'Scan execution failed',
          })
        }
      } catch (error) {
        console.error(`[Cron] Error processing subscription ${sub.stripe_subscription_id}:`, error)
        errors.push({
          scanId: sub.stripe_subscription_id,
          reason: `Error: ${String(error)}`,
        })
      }
    }

    console.log(
      `[Cron Rescan] Complete: ${scansCompleted.length}/${scansInitiated.length} scans completed, ${errors.length} errors`
    )

    return NextResponse.json({
      success: true,
      data: {
        scansInitiated: scansInitiated.length,
        scansCompleted: scansCompleted.length,
        errors,
      },
    })
  } catch (error) {
    console.error('[POST /api/cron/rescan] Error:', error)
    return NextResponse.json(
      { error: 'Cron execution failed' },
      { status: 500 }
    )
  }
}
