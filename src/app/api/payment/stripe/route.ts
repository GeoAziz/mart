import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';

export async function POST(req: Request) {
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
