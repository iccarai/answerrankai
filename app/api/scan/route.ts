export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe'
import type { BusinessContext } from '@/types'

const ScanInitSchema = z.object({
  businessName: z.string().min(1, 'Business name required').max(100),
  location: z.string().min(1, 'Location required').max(150),
  industry: z.string().min(1, 'Industry required').max(50),
  competitors: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        location: z.string().min(1).max(150),
      })
    )
    .max(5, 'Maximum 5 competitors'),
})

export async function POST(req: NextRequest) {
  try {
    // Parse and validate input
    const body = await req.json()
    const input = ScanInitSchema.parse(body)

    // Authenticate user
    const supabase = createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create business record
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        user_id: user.id,
        name: input.businessName,
        location: input.location,
        industry: input.industry,
        competitors: input.competitors,
      })
      .select()
      .single()

    if (businessError || !business) {
      console.error('Business creation error:', businessError)
      return NextResponse.json(
        { error: 'Failed to create business record' },
        { status: 500 }
      )
    }

    // Create scan record
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        user_id: user.id,
        business_id: business.id,
        status: 'pending',
        tier: 'one_time',
      })
      .select()
      .single()

    if (scanError || !scan) {
      console.error('Scan creation error:', scanError)
      return NextResponse.json(
        { error: 'Failed to create scan record' },
        { status: 500 }
      )
    }

    // Create Stripe checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://answerrank.ai'
    const session = await createCheckoutSession({
      scanId: scan.id,
      businessId: business.id,
      tier: 'one_time',
      successUrl: `${appUrl}/results/${scan.id}?status=pending`,
      cancelUrl: `${appUrl}/scan?cancelled=true`,
    })

    if (!session.url) {
      throw new Error('Failed to generate checkout URL')
    }

    return NextResponse.json({
      success: true,
      data: {
        businessId: business.id,
        scanId: scan.id,
        checkoutUrl: session.url,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ')
      return NextResponse.json(
        { error: `Invalid input: ${messages}` },
        { status: 400 }
      )
    }

    console.error('[POST /api/scan] Error:', error)
    return NextResponse.json(
      { error: 'Payment gateway error. Please try again.' },
      { status: 500 }
    )
  }
}
