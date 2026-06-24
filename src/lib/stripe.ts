import Stripe from 'stripe';

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    return null;
  }

  // Cast to any to avoid strict literal API version type mismatches across environments
  return new Stripe(secretKey, {
    apiVersion: ('2025-06-30.basil' as any),
  });
}
