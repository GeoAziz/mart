import { NextResponse, type NextRequest } from 'next/server';
import { getPaymentService } from '@/lib/payments/payment-service';
import { StripePaymentIntentSchema } from '@/lib/validation-schemas';
import { formatApiError } from '@/lib/api-errors';
import { applyRateLimit, rateLimitPresets } from '@/lib/rate-limiter';
import { withRequestMetrics } from '@/lib/api-metrics';

async function createStripeIntentHandler(req: NextRequest) {
  const limited = await applyRateLimit(req, rateLimitPresets.payment);
  if (limited) return limited;

  try {
    const validated = StripePaymentIntentSchema.parse(await req.json());

    const paymentService = getPaymentService();
    const result = await paymentService.createPayment('stripe', {
      amount: validated.amount,
      currency: validated.currency,
      orderId: validated.orderId,
      metadata: validated.metadata,
    });

    return NextResponse.json({ clientSecret: result.clientSecret }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Stripe error' }, { status: 500 });
  }
}

export const POST = withRequestMetrics(createStripeIntentHandler);
