/**
 * 🪝 PayPal Webhook Receiver
 * ==========================
 * 
 * THIS FILE: Listens for payment confirmations from PayPal
 * 
 * HOW IT WORKS:
 * 1. Customer pays on PayPal
 * 2. PayPal confirms: "Payment captured!"
 * 3. PayPal calls THIS endpoint with event details
 * 4. We update the order status in Firestore
 * 5. Customer sees: ✅ Order Processing
 * 
 * ANALOGY: Like a doorbell 🔔
 * - Customer pays = Ring the bell
 * - PayPal sends webhook = Doorbell rings
 * - Your code = You answer the door
 * 
 * EVENTS HANDLED:
 * ✅ PAYMENT.CAPTURE.COMPLETED — Payment successful → order "processing"
 * 💰 PAYMENT.CAPTURE.REFUNDED — Money returned → order "refunded"
 * ❌ PAYMENT.CAPTURE.DENIED — Payment failed → order "cancelled"
 * 
 * SETUP: You need to register this URL in PayPal Dashboard
 * URL: https://yourdomain.com/api/webhooks/paypal
 * Then copy the Webhook ID to .env as PAYPAL_WEBHOOK_ID
 * 
 * SECURITY: This is PUBLIC but safe because:
 * - PayPal signs every message
 * - We verify the signature = Proof it came from PayPal
 * - Not from a hacker
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { verifyPayPalWebhookSignature, throwIfWebhookVerificationFails } from '@/lib/webhook-verification';
import { processWebhookOnce } from '@/lib/webhook-idempotency';
import { validateStatusTransition } from '@/lib/order-state-machine';
import { formatApiError, createApiError, ErrorCodes } from '@/lib/api-errors';
import { withRequestMetrics } from '@/lib/api-metrics';
import { trackPaymentProcessed } from '@/lib/metrics';
import { enqueuePayment } from '@/lib/queue-service';
import { releaseReservations, restoreStockForOrder } from '@/lib/inventory';
import { confirmOrderAndRecordPurchaseTransaction } from '@/lib/analytics-outbox';

interface PayPalWebhookEvent {
  // WHAT PAYPAL SENDS US:
  // This is the "message" PayPal delivers
  
  id: string;
  // Unique ID for this event
  // Example: "WH-5LH12345..."
  // Use this to prevent duplicate processing
  
  event_type: string;
  // Type of event that happened
  // Options:
  //   "PAYMENT.CAPTURE.COMPLETED" — ✅ Payment worked!
  //   "PAYMENT.CAPTURE.REFUNDED"  — 💰 Customer got money back
  //   "PAYMENT.CAPTURE.DENIED"    — ❌ Payment failed
  
  resource: {
    id: string;
    // The PayPal capture/refund ID
    // Example: "7KB8ZZFB6HS5G"
    // This links to our order.paymentDetails.paypalCaptureId
    
    status?: string;
    // Status of the payment
    // "COMPLETED", "REFUNDED", "DENIED", etc.
    
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
        // The PayPal order ID
        // (If we stored it in order details)
      };
    };
    
    amount?: {
      value: string;
      // Amount paid: "50.00"
      currency_code: string;
      // Currency: "USD", "KES", etc.
    };
  };
  
  create_time: string;
  // When this event happened
  // ISO format: "2026-01-21T10:30:00Z"
}



async function handleCaptureCompleted(event: PayPalWebhookEvent): Promise<void> {
  const captureId = event.resource.id;
  const amount = event.resource.amount?.value || '0';
  const currency = event.resource.amount?.currency_code || 'USD';

  const ordersRef = firestoreAdmin.collection('orders');
  const query = ordersRef
    .where('paymentDetails.paypalCaptureId', '==', captureId)
    .limit(1);

  const snapshot = await query.get();

  if (snapshot.empty) {
    console.warn(`PayPal: No order found for capture ${captureId}`);
    return;
  }

  const orderDoc = snapshot.docs[0];
  const order = orderDoc.data();

  // Verify amount matches
  const captureAmount = parseFloat(amount);
  if (Math.abs(captureAmount - order.totalAmount) > 0.01) {
    throw createApiError(
      ErrorCodes.PAYMENT_ERROR,
      'Payment amount does not match order total',
      400
    );
  }

  // Transactional confirmation + Outbox record creation
  await confirmOrderAndRecordPurchaseTransaction({
    provider: 'paypal',
    paymentId: captureId,
    orderId: orderDoc.id,
    amount: order.totalAmount,
    currency: currency,
    providerReference: captureId,
    status: 'COMPLETED',
    verifiedAt: new Date().toISOString(),
  });

  console.log(`PayPal: Order ${orderDoc.id} payment confirmed transactionally with outbox`);
  trackPaymentProcessed('paypal', 'success');
  await releaseReservations(orderDoc.id);
  enqueuePayment({
    type: 'payment.completed',
    paymentId: event.id,
    orderId: orderDoc.id,
    amount: order.totalAmount || 0,
    method: 'paypal',
    status: 'COMPLETED',
    timestamp: new Date().toISOString(),
  }).catch((err) => console.error('Failed to enqueue payment:', err));
}

async function handleRefund(event: PayPalWebhookEvent): Promise<void> {
  const refundId = event.resource.id;
  const amount = event.resource.amount?.value || '0';

  const ordersRef = firestoreAdmin.collection('orders');
  const query = ordersRef
    .where('paymentDetails.paypalRefundId', '==', refundId)
    .limit(1);

  const snapshot = await query.get();

  if (snapshot.empty) {
    console.warn(`PayPal: No order found for refund ${refundId}`);
    return;
  }

  const orderDoc = snapshot.docs[0];
  const order = orderDoc.data();

  // Validate status transition
  validateStatusTransition(order.status, 'refunded');

  // Update order
  await orderDoc.ref.update({
    status: 'refunded',
    paymentDetails: {
      ...order.paymentDetails,
      status: 'REFUNDED',
      paypalRefundId: refundId,
      refundedAmount: parseFloat(amount),
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    statusHistory: admin.firestore.FieldValue.arrayUnion({
      status: 'refunded',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      note: `Refund processed via PayPal: ${amount}`,
    }),
  });

  console.log(`PayPal: Order ${orderDoc.id} refunded`);
  trackPaymentProcessed('paypal', 'refunded');
}

async function handleCapturedDenied(event: PayPalWebhookEvent): Promise<void> {
  const captureId = event.resource.id;

  const ordersRef = firestoreAdmin.collection('orders');
  const query = ordersRef
    .where('paymentDetails.paypalCaptureId', '==', captureId)
    .limit(1);

  const snapshot = await query.get();

  if (snapshot.empty) {
    console.warn(`PayPal: No order found for capture ${captureId}`);
    return;
  }

  const orderDoc = snapshot.docs[0];
  const order = orderDoc.data();

  // Validate status transition
  validateStatusTransition(order.status, 'cancelled');

  // Update order
  await orderDoc.ref.update({
    status: 'cancelled',
    paymentDetails: {
      ...order.paymentDetails,
      status: 'DENIED',
      paypalCaptureId: captureId,
      webhookVerified: true,
      webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    statusHistory: admin.firestore.FieldValue.arrayUnion({
      status: 'cancelled',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      note: 'Payment denied by PayPal',
    }),
  });

  console.log(`PayPal: Order ${orderDoc.id} cancelled`);
  trackPaymentProcessed('paypal', 'failed');
  await restoreStockForOrder(orderDoc.id);
  enqueuePayment({
    type: 'payment.failed',
    paymentId: event.id,
    orderId: orderDoc.id,
    amount: order.totalAmount || 0,
    method: 'paypal',
    status: 'FAILED',
    timestamp: new Date().toISOString(),
  }).catch((err) => console.error('Failed to enqueue payment:', err));
}

async function paypalWebhookHandler(req: NextRequest) {
  try {
    const body = await req.json() as PayPalWebhookEvent;

    // Extract headers
    const signature = req.headers.get('paypal-transmission-sig') || '';
    const transmissionId = req.headers.get('paypal-transmission-id') || '';
    const transmissionTime = req.headers.get('paypal-transmission-time') || '';
    const certUrl = req.headers.get('paypal-cert-url') || '';
    const bodyText = JSON.stringify(body);

    // Verify webhook signature
    const isValid = await verifyPayPalWebhookSignature(
      bodyText,
      transmissionId,
      transmissionTime,
      certUrl,
      signature,
      process.env.PAYPAL_WEBHOOK_ID || ''
    );
    throwIfWebhookVerificationFails(isValid, 'PayPal');

    // Process with idempotency
    await processWebhookOnce(
      'paypal',
      body.id,
      body.event_type,
      async () => {
        switch (body.event_type) {
          case 'PAYMENT.CAPTURE.COMPLETED':
            await handleCaptureCompleted(body);
            break;

          case 'PAYMENT.CAPTURE.REFUNDED':
            await handleRefund(body);
            break;

          case 'PAYMENT.CAPTURE.DENIED':
            await handleCapturedDenied(body);
            break;

          default:
            console.log(`PayPal: Unhandled event type ${body.event_type}`);
        }

        return { processed: true };
      }
    );

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const { response } = formatApiError(error);
    // Always return OK for webhook to prevent duplicate retries
    return NextResponse.json(
      { error: 'Webhook processing failed', logged: true },
      { status: 200 }
    );
  }
}

export const POST = withRequestMetrics(paypalWebhookHandler);
