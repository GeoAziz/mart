import { NextResponse, type NextRequest } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { StripePaymentIntentSchema, PayPalOrderSchema, CreateRefundRequestSchema } from '@/lib/validation-schemas';
import { formatApiError } from '@/lib/api-errors';
import { applyRateLimit, rateLimitPresets } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, rateLimitPresets.payment);
  if (limited) return limited;

  try {
    const stripe = getStripeClient();

    if (!stripe) {
      return NextResponse.json(
        { message: 'Stripe configuration error: STRIPE_SECRET_KEY is required.' },
        { status: 500 }
      );
    }

    const { amount, currency, metadata } = await req.json();
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
    });
    return NextResponse.json({ clientSecret: paymentIntent.client_secret }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Stripe error' }, { status: 500 });
  }
}
