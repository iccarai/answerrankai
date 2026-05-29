export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { executeScan } from '@/app/api/utils/scanExecution'
import type { BusinessContext } from '@/types'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = headers().get('stripe-signature')

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(session, adminClient)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionEvent(subscription, adminClient)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription, adminClient)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ received: true })
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  adminClient: any
) {
  const scanId = session.metadata?.scanId
  const businessId = session.metadata?.businessId

  if (!scanId || !businessId) {
    console.error('Missing scanId or businessId in session metadata')
    return
  }

  try {
    const { data: scan } = await adminClient
      .from('scans')
      .select('id, user_id, business_id')
      .eq('id', scanId)
      .single()

    if (!scan) {
      console.error(`Scan not found: ${scanId}`)
      return
    }

    const { data: business } = await adminClient
      .from('businesses')
      .select('name, location, industry, competitors')
      .eq('id', businessId)
      .single()

    if (!business) {
      console.error(`Business not found: ${businessId}`)
      return
    }

    // Update scan to running and store stripe session ID
    await adminClient
      .from('scans')
      .update({
        status: 'running',
        stripe_session_id: session.id,
      })
      .eq('id', scanId)

    // Build business context for scan execution
    const businessContext: BusinessContext = {
      name: business.name,
      location: business.location,
      industry: business.industry,
      competitors: business.competitors || [],
    }

    // Execute scan (runs AI queries, calculates score, generates fixes)
    await executeScan({
      scanId,
      userId: scan.user_id,
      businessId,
      business: businessContext,
      adminClient,
    })
  } catch (error) {
    console.error(`[Webhook] Failed to process checkout for scan ${scanId}:`, error)
    // Mark scan as failed
    await adminClient
      .from('scans')
      .update({ status: 'failed' })
      .eq('id', scanId)
      .catch((e: unknown) => console.error('Failed to mark scan as failed:', e))
  }
}

async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  adminClient: any
) {
  try {
    const { data: existingSub } = await adminClient
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    const subData = {
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      tier: subscription.metadata?.tier || 'dfy',
      status: mapSubscriptionStatus(subscription.status),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    }

    if (existingSub) {
      await adminClient
        .from('subscriptions')
        .update(subData)
        .eq('id', existingSub.id)
    } else {
      // For new subscriptions, we need the user_id
      // This would be stored in metadata or we'd need to look it up from Stripe customer
      const customer = await stripe.customers.retrieve(subscription.customer as string)
      const userId = (customer as any).metadata?.userId

      if (!userId) {
        console.warn(
          `No userId found for customer ${subscription.customer}. Skipping subscription creation.`
        )
        return
      }

      await adminClient.from('subscriptions').insert({
        user_id: userId,
        ...subData,
      })
    }
  } catch (error) {
    console.error('Failed to handle subscription event:', error)
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  adminClient: any
) {
  try {
    await adminClient
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id)
  } catch (error) {
    console.error('Failed to mark subscription as cancelled:', error)
  }
}

function mapSubscriptionStatus(
  stripeStatus: string
): 'active' | 'cancelled' | 'past_due' {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    default:
      return 'cancelled'
  }
}
