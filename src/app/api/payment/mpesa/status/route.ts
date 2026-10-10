import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { getPaymentService } from '@/lib/payments/payment-service';
import { formatApiError } from '@/lib/api-errors';
import { z } from 'zod';

const QueryMpesaStatusSchema = z.object({
  merchantRequestId: z.string().min(1),
  checkoutRequestId: z.string().min(1),
});

async function queryMpesaStatusHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const validated = QueryMpesaStatusSchema.parse(body);

    const paymentService = getPaymentService();
    const result = await paymentService.queryPaymentStatus('mpesa', {
      providerPaymentId: validated.merchantRequestId,
      providerPaymentIdAlt: validated.checkoutRequestId,
    });

    return NextResponse.json(
      {
        status: result.status,
        providerPaymentId: result.providerPaymentId,
        raw: result.raw,
      },
      { status: 200 }
    );
  } catch (error) {
    const { response } = formatApiError(error);
    return response;
  }
}

export const POST = withAuth(queryMpesaStatusHandler);
