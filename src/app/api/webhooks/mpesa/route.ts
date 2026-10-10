import { NextResponse } from 'next/server';
import { firestoreAdmin as db } from '@/lib/firebase-admin';
import { processWebhookOnce } from '@/lib/webhook-idempotency';
import { validateStatusTransition } from '@/lib/order-state-machine';
import { withRequestMetrics } from '@/lib/api-metrics';
import { trackPaymentProcessed } from '@/lib/metrics';
import { enqueuePayment } from '@/lib/queue-service';
import { releaseReservations, restoreStockForOrder } from '@/lib/inventory';
import admin from 'firebase-admin';

interface StkCallback {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: number;
  ResultDesc?: string;
  CallbackMetadata?: {
    Item?: Array<{ Name: string; Value?: string | number }>;
  };
}

function findOrderByMpesaRequest(
  merchantRequestId: string,
  checkoutRequestId: string
) {
  return db
    .collection('orders')
    .where('paymentDetails.mpesaMerchantRequestId', '==', merchantRequestId)
    .where('paymentDetails.mpesaCheckoutRequestId', '==', checkoutRequestId)
    .limit(1)
    .get();
}

function extractReceipt(callback: StkCallback): string | undefined {
  return callback.CallbackMetadata?.Item?.find((item) => item.Name === 'MpesaReceiptNumber')
    ?.Value as string | undefined;
}

async function handleStkCallback(callback: StkCallback): Promise<void> {
  const merchantRequestId = callback.MerchantRequestID;
  const checkoutRequestId = callback.CheckoutRequestID;

  if (!merchantRequestId || !checkoutRequestId) {
    throw new Error('M-Pesa callback missing request IDs');
  }

  const snapshot = await findOrderByMpesaRequest(merchantRequestId, checkoutRequestId);

  if (snapshot.empty) {
    console.warn(`M-Pesa: No order found for checkout request ${checkoutRequestId}`);
    return;
  }

  const orderDoc = snapshot.docs[0];
  const order = orderDoc.data();
  const succeeded = callback.ResultCode === 0;
  const receipt = extractReceipt(callback);

  const nextStatus = succeeded ? 'confirmed' : 'cancelled';
  validateStatusTransition(order.status, nextStatus);

  await orderDoc.ref.update({
    status: nextStatus,
    paymentDetails: {
      ...order.paymentDetails,
      provider: 'mpesa',
      status: succeeded ? 'COMPLETED' : 'FAILED',
      mpesaMerchantRequestId: merchantRequestId,
      mpesaCheckoutRequestId: checkoutRequestId,
      mpesaReceiptNumber: receipt,
      mpesaResultCode: callback.ResultCode,
      mpesaResultDesc: callback.ResultDesc,
      webhookVerified: true,
      webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    statusHistory: admin.firestore.FieldValue.arrayUnion({
      status: nextStatus,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      note: succeeded
        ? `M-Pesa payment confirmed${receipt ? ` (Receipt ${receipt})` : ''}`
        : `M-Pesa payment failed: ${callback.ResultDesc}`,
    }),
  });

  console.log(`M-Pesa: Order ${orderDoc.id} ${succeeded ? 'confirmed' : 'cancelled'}`);
  trackPaymentProcessed('mpesa', succeeded ? 'success' : 'failed');
  if (succeeded) {
    await releaseReservations(orderDoc.id);
  } else {
    await restoreStockForOrder(orderDoc.id);
  }
  enqueuePayment({
    type: succeeded ? 'payment.completed' : 'payment.failed',
    paymentId: receipt || checkoutRequestId,
    orderId: orderDoc.id,
    amount: order.totalAmount || 0,
    method: 'mpesa',
    status: succeeded ? 'COMPLETED' : 'FAILED',
    timestamp: new Date().toISOString(),
  }).catch((err) => console.error('Failed to enqueue payment:', err));
}

async function mpesaWebhookHandler(req: Request) {
  try {
    const body = await req.json() as { Body?: { stkCallback?: StkCallback } };
    const callback = body.Body?.stkCallback;

    if (!callback) {
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: 'Invalid callback payload' },
        { status: 400 }
      );
    }

    const eventId = callback.CheckoutRequestID || callback.MerchantRequestID || 'unknown';

    await processWebhookOnce('mpesa', eventId, 'mpesa.stk_callback', async () => {
      await handleStkCallback(callback);
      return { processed: true };
    });

    // Safaricom requires a 200 with ResultCode 0 to stop retries.
    return NextResponse.json(
      { ResultCode: 0, ResultDesc: 'Success' },
      { status: 200 }
    );
  } catch (error) {
    console.error('M-Pesa webhook error:', error);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: 'Internal error' },
      { status: 500 }
    );
  }
}

export const POST = withRequestMetrics(mpesaWebhookHandler);
