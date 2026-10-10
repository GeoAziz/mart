import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import { firestoreAdmin as db } from '@/lib/firebase-admin';
import { verifyStripeWebhookSignature, throwIfWebhookVerificationFails } from '@/lib/webhook-verification';
import { processWebhookOnce } from '@/lib/webhook-idempotency';
import { validateStatusTransition } from '@/lib/order-state-machine';
import { formatApiError, createApiError, ErrorCodes } from '@/lib/api-errors';
import { withRequestMetrics } from '@/lib/api-metrics';
import { trackPaymentProcessed } from '@/lib/metrics';
import { enqueuePayment } from '@/lib/queue-service';
import { releaseReservations, restoreStockForOrder } from '@/lib/inventory';
import admin from 'firebase-admin';

/**
 * Stripe Webhook Handler
 * Processes payment events from Stripe
 */

async function handlePaymentIntentSucceeded(event: Stripe.PaymentIntentSucceededEvent): Promise<void> {
  const paymentIntent = event.data.object;

  // Find order by Stripe payment intent ID
  const ordersRef = db.collection('orders');
  const query = ordersRef
    .where('paymentDetails.stripePaymentIntentId', '==', paymentIntent.id)
    .limit(1);

  const snapshot = await query.get();

  if (snapshot.empty) {
    console.warn(`Stripe: No order found for payment intent ${paymentIntent.id}`);
    return;
  }

  const orderDoc = snapshot.docs[0];
  const order = orderDoc.data();

  // Verify amount matches
  const stripeAmount = paymentIntent.amount / 100; // Convert cents to dollars
  const orderAmount = order.totalAmount;

  if (Math.abs(stripeAmount - orderAmount) > 0.01) {
    console.error(
      `Stripe: Payment amount mismatch. Stripe: ${stripeAmount}, Order: ${orderAmount}`
    );
    throw createApiError(
      ErrorCodes.PAYMENT_ERROR,
      'Payment amount does not match order',
      400
    );
  }

  // Validate status transition
  validateStatusTransition(order.status, 'confirmed');

  // Update order with payment confirmation
  await orderDoc.ref.update({
    status: 'confirmed',
    paymentDetails: {
      ...order.paymentDetails,
      status: 'COMPLETED',
      stripePaymentIntentId: paymentIntent.id,
      stripeStatus: paymentIntent.status,
      webhookVerified: true,
      webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    statusHistory: admin.firestore.FieldValue.arrayUnion({
      status: 'confirmed',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      note: 'Payment confirmed via Stripe webhook',
    }),
  });

  console.log(`Stripe: Order ${orderDoc.id} payment confirmed`);
  trackPaymentProcessed('stripe', 'success');
  await releaseReservations(orderDoc.id);
  enqueuePayment({
    type: 'payment.completed',
    paymentId: paymentIntent.id,
    orderId: orderDoc.id,
    amount: orderAmount,
    method: 'stripe',
    status: 'COMPLETED',
    timestamp: new Date().toISOString(),
  }).catch((err) => console.error('Failed to enqueue payment:', err));
}

async function handlePaymentIntentFailed(event: Stripe.PaymentIntentFailedEvent): Promise<void> {
  const paymentIntent = event.data.object;

  const ordersRef = db.collection('orders');
  const query = ordersRef
    .where('paymentDetails.stripePaymentIntentId', '==', paymentIntent.id)
    .limit(1);

  const snapshot = await query.get();

  if (snapshot.empty) {
    console.warn(`Stripe: No order found for payment intent ${paymentIntent.id}`);
    return;
  }

  const orderDoc = snapshot.docs[0];
  const order = orderDoc.data();

  // Validate status transition
  validateStatusTransition(order.status, 'cancelled');

  // Update order status
  await orderDoc.ref.update({
    status: 'cancelled',
    paymentDetails: {
      ...order.paymentDetails,
      status: 'FAILED',
      stripePaymentIntentId: paymentIntent.id,
      stripeStatus: paymentIntent.status,
      failureReason: paymentIntent.last_payment_error?.message,
      webhookVerified: true,
      webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    statusHistory: admin.firestore.FieldValue.arrayUnion({
      status: 'cancelled',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      note: `Payment failed: ${paymentIntent.last_payment_error?.message}`,
    }),
  });

  console.log(`Stripe: Order ${orderDoc.id} payment failed`);
  trackPaymentProcessed('stripe', 'failed');
  await restoreStockForOrder(orderDoc.id);
  enqueuePayment({
    type: 'payment.failed',
    paymentId: paymentIntent.id,
    orderId: orderDoc.id,
    amount: order.totalAmount || 0,
    method: 'stripe',
    status: 'FAILED',
    timestamp: new Date().toISOString(),
  }).catch((err) => console.error('Failed to enqueue payment:', err));
}

async function handleChargeRefunded(event: Stripe.ChargeRefundedEvent): Promise<void> {
  const charge = event.data.object;

  const ordersRef = db.collection('orders');
  const query = ordersRef
    .where('paymentDetails.stripeChargeId', '==', charge.id)
    .limit(1);

  const snapshot = await query.get();

  if (snapshot.empty) {
    console.warn(`Stripe: No order found for charge ${charge.id}`);
    return;
  }

  const orderDoc = snapshot.docs[0];
  const order = orderDoc.data();

  // Validate status transition
  validateStatusTransition(order.status, 'refunded');

  // Update order status
  await orderDoc.ref.update({
    status: 'refunded',
    paymentDetails: {
      ...order.paymentDetails,
      status: 'REFUNDED',
      refundedAmount: charge.refunded / 100, // Convert cents to dollars
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    statusHistory: admin.firestore.FieldValue.arrayUnion({
      status: 'refunded',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      note: `Refund processed: ${charge.refunded / 100}`,
    }),
  });

  console.log(`Stripe: Order ${orderDoc.id} refunded`);
  trackPaymentProcessed('stripe', 'refunded');
  enqueuePayment({
    type: 'payment.refunded',
    paymentId: charge.id,
    orderId: orderDoc.id,
    amount: charge.refunded / 100,
    method: 'stripe',
    status: 'REFUNDED',
    timestamp: new Date().toISOString(),
  }).catch((err) => console.error('Failed to enqueue refund:', err));
}

async function stripeWebhookHandler(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      throw createApiError(
        ErrorCodes.PAYMENT_ERROR,
        'Missing Stripe signature',
        401
      );
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw createApiError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'Stripe webhook secret not configured',
        500
      );
    }

    // Verify webhook signature
    const isValid = await verifyStripeWebhookSignature(body, signature, secret);
    throwIfWebhookVerificationFails(isValid, 'Stripe');

    // Parse event
    const event = JSON.parse(body) as Stripe.Event;

    // Process webhook with idempotency
    await processWebhookOnce(
      'stripe',
      event.id,
      event.type,
      async () => {
        switch (event.type) {
          case 'payment_intent.succeeded':
            await handlePaymentIntentSucceeded(event as Stripe.PaymentIntentSucceededEvent);
            break;

          case 'payment_intent.payment_failed':
            await handlePaymentIntentFailed(event as Stripe.PaymentIntentFailedEvent);
            break;

          case 'charge.refunded':
            await handleChargeRefunded(event as Stripe.ChargeRefundedEvent);
            break;

          default:
            console.log(`Stripe: Unhandled event type ${event.type}`);
        }

        return { processed: true };
      }
    );

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const { response } = formatApiError(error);
    return response;
  }
}

export const POST = withRequestMetrics(stripeWebhookHandler);
