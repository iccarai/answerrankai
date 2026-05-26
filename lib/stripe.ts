import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function createCheckoutSession(params: {
  scanId: string
  businessId: string
  tier: 'one_time' | 'monthly'
  successUrl: string
  cancelUrl: string
}) {
  const priceId =
    params.tier === 'one_time'
      ? process.env.STRIPE_PRICE_AUDIT_297
      : process.env.STRIPE_PRICE_DFY_1497

  if (!priceId) {
    throw new Error(
      `STRIPE_PRICE_${params.tier === 'one_time' ? 'AUDIT_297' : 'DFY_1497'} not configured`
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
