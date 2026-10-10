import { NextResponse } from 'next/server';
import { getPaymentService } from '@/lib/payments/payment-service';
import { createPaypalOrderSchema } from '@/lib/validation-schemas';
import { formatApiError, createApiError, ErrorCodes } from '@/lib/api-errors';
import { withRequestMetrics } from '@/lib/api-metrics';

// POST /api/payment/paypal/order
// Creates a PayPal order using REST API v2 via the PayPal adapter.
async function createPayPalOrderHandler(req: Request) {
  try {
    const body = await req.json();
    const validated = createPaypalOrderSchema.parse(body);

    const paymentService = getPaymentService();
    const result = await paymentService.createPayment('paypal', {
      amount: validated.amount,
      currency: validated.currency,
      description: 'ZilaCart Purchase',
    });

    return NextResponse.json(
      {
        id: result.providerPaymentId,
        currency: result.currency,
        amount: String(result.amount),
        conversionNotice: (result.raw as any)?.conversionNotice,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('PayPal authentication failed')) {
      return NextResponse.json(
        {
          message: 'PayPal authentication failed. Please check credentials.',
          error: 'AUTH_ERROR',
        },
        { status: 500 }
      );
    }
    if (error instanceof Error && error.message.includes('PayPal configuration error')) {
      throw createApiError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        error.message,
        500
      );
    }
    const { response } = formatApiError(error);
    return response;
  }
}

export const POST = withRequestMetrics(createPayPalOrderHandler);
