import { NextResponse } from 'next/server';
import { getPaymentService } from '@/lib/payments/payment-service';
import { withRequestMetrics } from '@/lib/api-metrics';

// POST /api/payment/paypal/capture
// Captures a PayPal order after user approval using REST API v2 via the adapter.
async function capturePayPalOrderHandler(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ message: 'Missing or invalid orderId.' }, { status: 400 });
    }

    const paymentService = getPaymentService();
    const result = await paymentService.capturePayment('paypal', {
      providerPaymentId: orderId,
    });

    return NextResponse.json(
      {
        success: result.status === 'completed',
        status: result.status === 'completed' ? 'COMPLETED' : 'PENDING',
        orderId,
        message:
          result.status === 'completed'
            ? 'Payment captured successfully'
            : 'Payment is still pending',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ PayPal capture error:', error);

    if (error?.cause?.code === 'ECONNREFUSED' || error?.cause?.code === 'ENOTFOUND') {
      return NextResponse.json(
        {
          success: false,
          message: 'Cannot connect to PayPal. Please check your internet connection.',
          error: 'NETWORK_ERROR',
        },
        { status: 503 }
      );
    }

    if (error?.name === 'AbortError' || error?.cause?.code === 'ETIMEDOUT') {
      return NextResponse.json(
        {
          success: false,
          message: 'PayPal request timed out. Please try again.',
          error: 'TIMEOUT_ERROR',
        },
        { status: 504 }
      );
    }

    if (error?.message?.includes('not found') || error?.message?.includes('no longer valid')) {
      return NextResponse.json(
        {
          success: false,
          message: 'PayPal order not found or is no longer valid',
          error: 'INVALID_ORDER',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'PayPal error occurred',
        error: 'UNKNOWN_ERROR',
      },
      { status: 500 }
    );
  }
}

export const POST = withRequestMetrics(capturePayPalOrderHandler);
