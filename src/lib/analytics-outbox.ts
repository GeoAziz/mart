import { firestoreAdmin as db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { validateStatusTransition } from '@/lib/order-state-machine';
import type { Order } from '@/lib/types';
import type {
  VerifiedPaymentResult,
  AnalyticsOutboxRecord,
  GA4Item,
} from '@/lib/analytics-types';

/**
 * Builds a validated AnalyticsOutboxRecord from an authoritative Order.
 * Correctly computes value = sum(item.price * item.quantity).
 */
export function buildOutboxRecord(
  orderId: string,
  order: Order,
  payment: VerifiedPaymentResult
): AnalyticsOutboxRecord {
  const outboxDocId = `${orderId}_purchase`;
  const attribution = order.paymentDetails?.attribution;
  const consentStatus = attribution?.consentSnapshot?.analyticsStorage;

  // Determine initial status based on consent and valid client_id
  let status: AnalyticsOutboxRecord['status'] = 'pending';
  let suppressionReason: AnalyticsOutboxRecord['suppressionReason'];

  if (consentStatus !== 'granted') {
    status = 'suppressed';
    suppressionReason = 'consent_denied';
  } else if (!attribution?.clientId || typeof attribution.clientId !== 'string' || attribution.clientId.trim() === '') {
    status = 'suppressed';
    suppressionReason = 'missing_client_id';
  }

  // Authoritative historical item mapping & item-revenue calculation
  const items: GA4Item[] = (order.items || []).map((item) => {
    const gaItem: GA4Item = {
      item_id: item.productId,
      item_name: item.name,
      price: Number(item.price), // major currency units
      quantity: Number(item.quantity),
    };
    if (item.vendorId) {
      gaItem.vendor_id = item.vendorId;
    }
    return gaItem;
  });

  // GA4 value: sum of items, strictly excluding shipping and tax
  const ga4Value = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    id: outboxDocId,
    orderId,
    eventType: 'purchase',
    status,
    suppressionReason,
    attemptCount: 0,
    maxAttempts: 5,
    nextAttemptAt: admin.firestore.Timestamp.now(),
    lockedAt: null,
    lockedBy: null,
    leaseExpiresAt: null,
    leaseId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    payload: {
      transaction_id: orderId,
      value: Number(ga4Value.toFixed(2)),
      currency: payment.currency,
      shipping: Number(order.shippingCost || 0),
      tax: Number(order.taxAmount || 0),
      payment_method: payment.provider,
      shipping_county: order.shippingAddress?.city,
      items,
      attribution,
      is_synthetic: (order as any).is_synthetic ? 1 : undefined,
      traffic_type: (order as any).traffic_type || undefined,
    },
  };
}

/**
 * Builds an Outbox record for a Refund transaction.
 */
export function buildRefundOutboxRecord(
  orderId: string,
  order: Order,
  refundDetails: {
    amount: number;
    currency: string;
    refundId: string;
    items?: GA4Item[];
    attribution?: AttributionContext;
  }
): AnalyticsOutboxRecord {
  const attribution: AttributionContext | undefined =
    refundDetails.attribution ||
    (order as any).attributionContext ||
    (order.paymentDetails as any)?.attributionContext;

  const items: GA4Item[] = refundDetails.items || (order.items || []).map((item) => ({
    item_id: item.productId,
    item_name: item.name || 'Unknown Product',
    price: Number(item.price),
    quantity: Number(item.quantity),
  }));

  return {
    id: `${orderId}_refund_${refundDetails.refundId}`,
    orderId,
    eventType: 'refund',
    status: 'pending',
    attemptCount: 0,
    maxAttempts: 5,
    nextAttemptAt: admin.firestore.Timestamp.now(),
    lockedAt: null,
    lockedBy: null,
    leaseExpiresAt: null,
    leaseId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    payload: {
      transaction_id: orderId,
      value: Number(refundDetails.amount.toFixed(2)),
      currency: refundDetails.currency,
      shipping: 0,
      tax: 0,
      payment_method: order.paymentDetails?.provider || 'unknown',
      shipping_county: order.shippingAddress?.city,
      items,
      attribution,
      is_synthetic: (order as any).is_synthetic ? 1 : undefined,
      traffic_type: (order as any).traffic_type || undefined,
    },
  };
}

/**
 * Creates an idempotent outbox record for an approved/processed refund.
 */
export async function recordRefundTransaction(params: {
  orderId: string;
  refundId: string;
  amount: number;
  currency: string;
  items?: GA4Item[];
}): Promise<{ recorded: boolean; outboxId: string }> {
  const { orderId, refundId, amount, currency, items } = params;
  const outboxDocId = `${orderId}_refund_${refundId}`;
  const outboxRef = db.collection('analytics_outbox').doc(outboxDocId);
  const orderRef = db.collection('orders').doc(orderId);

  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    throw new Error(`Order ${orderId} does not exist for refund recording`);
  }

  const order = orderSnap.data() as Order;
  const existingOutbox = await outboxRef.get();
  if (existingOutbox.exists) {
    return { recorded: true, outboxId: outboxDocId };
  }

  const record = buildRefundOutboxRecord(orderId, order, {
    amount,
    currency,
    refundId,
    items,
  });

  await outboxRef.set(record);
  return { recorded: true, outboxId: outboxDocId };
}

/**
 * Executes an atomic order transition to 'confirmed' and idempotent outbox creation.
 * Handles duplicate callbacks, order repairs, and conflicting payment attempts.
 */
export async function confirmOrderAndRecordPurchaseTransaction(
  payment: VerifiedPaymentResult
): Promise<{ confirmed: boolean; outboxId: string; replayed: boolean }> {
  const { orderId } = payment;
  const orderRef = db.collection('orders').doc(orderId);
  const outboxDocId = `${orderId}_purchase`;
  const outboxRef = db.collection('analytics_outbox').doc(outboxDocId);

  return db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) {
      throw new Error(`Order ${orderId} does not exist`);
    }

    const order = orderSnap.data() as Order;
    const outboxSnap = await transaction.get(outboxRef);

    // ── Payment Verification Integrity Checks ──
    // 1. Verify currency match
    const orderCurrency = order.paymentDetails?.currency || 'KES';
    if (orderCurrency !== payment.currency) {
      throw new Error(
        `Payment currency mismatch for order ${orderId}: expected ${orderCurrency}, got ${payment.currency}`
      );
    }

    // 2. Verify amount match within 0.01 tolerance
    if (Math.abs(order.totalAmount - payment.amount) > 0.01) {
      throw new Error(
        `Payment amount mismatch for order ${orderId}: expected ${order.totalAmount}, got ${payment.amount}`
      );
    }

    // ── Replay Case: Order already confirmed ──
    if (order.status === 'confirmed') {
      const existingPaymentId =
        order.paymentDetails?.paymentId ||
        order.paymentDetails?.mpesaReceiptNumber ||
        order.paymentDetails?.stripePaymentIntentId ||
        order.paymentDetails?.paypalCaptureId;

      if (existingPaymentId === payment.paymentId) {
        // Idempotent replay: If outbox doc is missing, repair it.
        if (!outboxSnap.exists) {
          const repairedRecord = buildOutboxRecord(orderId, order, payment);
          transaction.set(outboxRef, repairedRecord);
          return { confirmed: true, outboxId: outboxDocId, replayed: true };
        }
        // Both order and outbox already exist in matching state: no-op
        return { confirmed: true, outboxId: outboxDocId, replayed: true };
      } else {
        throw new Error(
          `Order ${orderId} is already confirmed under different payment ID ${existingPaymentId}`
        );
      }
    }

    // ── Fresh Confirmation: pending / payment_pending -> confirmed ──
    validateStatusTransition(order.status, 'confirmed');

    // 1. Stage order update
    transaction.update(orderRef, {
      status: 'confirmed',
      paymentDetails: {
        ...order.paymentDetails,
        status: 'COMPLETED',
        paymentId: payment.paymentId,
        provider: payment.provider,
        providerReference: payment.providerReference,
        currency: payment.currency,
        webhookVerified: true,
        webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: 'confirmed',
        timestamp: admin.firestore.Timestamp.now(),
        note: `Payment confirmed via ${payment.provider} (Ref: ${payment.paymentId})`,
      }),
    });

    // 2. Stage Outbox creation
    if (!outboxSnap.exists) {
      const outboxRecord = buildOutboxRecord(orderId, order, payment);
      transaction.set(outboxRef, outboxRecord);
    }

    return { confirmed: true, outboxId: outboxDocId, replayed: false };
  });
}

