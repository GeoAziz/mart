import Stripe from 'stripe';

let cachedStripe: Stripe | null | undefined;

export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    return null;
  }

  if (cachedStripe !== undefined) {
    return cachedStripe;
  }

  // Cast to any to avoid strict literal API version type mismatches across environments
  cachedStripe = new Stripe(secretKey, {
    apiVersion: ('2025-06-30.basil' as any),
  });

  return cachedStripe;
}

export function requireStripeClient(): Stripe {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe configuration error: STRIPE_SECRET_KEY is required');
  }
  return stripe;
}
