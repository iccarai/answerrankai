import Stripe from 'stripe'

export const stripe = new Stripe(process.env.stripe_secret_key!)

export async function createCheckoutSession(params: {
  scanId: string
  businessId: string
  tier: 'one_time' | 'monthly'
  successUrl: string
  cancelUrl: string
}) {
  const priceId =
    params.tier === 'one_time'
      ? process.env.stripe_price_audit_297
      : process.env.stripe_price_dfy_1497

  if (!priceId) {
    throw new Error(
      `stripe_price_${params.tier === 'one_time' ? 'audit_297' : 'dfy_1497'} not configured`
    )
  }

  return stripe.checkout.sessions.create({
    line_items: [{ price: priceId, quantity: 1 }],
    mode: params.tier === 'one_time' ? 'payment' : 'subscription',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.scanId,
    metadata: {
      scanId: params.scanId,
      businessId: params.businessId,
      tier: params.tier,
    },
  })
}
