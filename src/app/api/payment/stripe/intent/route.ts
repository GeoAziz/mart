import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { getPaymentService } from '@/lib/payments/payment-service';
import { createPaymentIntentSchema } from '@/lib/validation-schemas';
import { formatApiError } from '@/lib/api-errors';

async function createPaymentIntentHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const validated = createPaymentIntentSchema.parse(body);

    const paymentService = getPaymentService();
    const result = await paymentService.createPayment('stripe', {
      amount: validated.amount,
      currency: validated.currency,
      orderId: validated.orderId,
      metadata: validated.metadata,
    });

    return NextResponse.json(
      {
        clientSecret: result.clientSecret,
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
