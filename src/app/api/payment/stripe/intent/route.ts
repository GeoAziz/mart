import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { getStripeClient } from '@/lib/stripe';
import { createPaymentIntentSchema } from '@/lib/validation-schemas';
import { formatApiError, createApiError, ErrorCodes } from '@/lib/api-errors';

async function createPaymentIntentHandler(req: AuthenticatedRequest) {
  try {
    const stripe = getStripeClient();

    if (!stripe) {
      throw createApiError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'Stripe configuration error: STRIPE_SECRET_KEY is required',
        500
      );
    }

    const body = await req.json();
    const validated = createPaymentIntentSchema.parse(body);

    // Convert to cents for Stripe
    const amountInCents = Math.round(validated.amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: validated.currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: validated.orderId || 'unknown',
      },
    });

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        amount: validated.amount,
        currency: validated.currency,
      },
      { status: 200 }
    );
  } catch (error) {
    const { response } = formatApiError(error);
    return response;
  }
}

export const POST = withAuth(createPaymentIntentHandler);
