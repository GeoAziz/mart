import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { getPaymentService } from '@/lib/payments/payment-service';
import { formatApiError } from '@/lib/api-errors';
import { z } from 'zod';

const CreateMpesaPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('KES'),
  orderId: z.string().optional(),
  phoneNumber: z
    .string()
    .regex(/^254\d{9}$/, 'Phone number must be in international format, e.g. 254712345678'),
  description: z.string().optional(),
});

async function createMpesaPaymentHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const validated = CreateMpesaPaymentSchema.parse(body);

    const paymentService = getPaymentService();
    const result = await paymentService.createPayment('mpesa', {
      amount: validated.amount,
      currency: validated.currency,
      orderId: validated.orderId,
      phoneNumber: validated.phoneNumber,
      description: validated.description,
    });

    return NextResponse.json(
      {
        merchantRequestId: result.providerPaymentId,
        checkoutRequestId: (result.raw as { CheckoutRequestID?: string })?.CheckoutRequestID,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        message: 'STK push sent. Awaiting customer approval on their phone.',
      },
      { status: 200 }
    );
  } catch (error) {
    const { response } = formatApiError(error);
    return response;
  }
}

export const POST = withAuth(createMpesaPaymentHandler);
