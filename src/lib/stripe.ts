import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Cast to any to avoid strict literal API version type mismatches across environments
  apiVersion: ('2025-06-30.basil' as any),
});
