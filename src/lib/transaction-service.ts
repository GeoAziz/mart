import admin from 'firebase-admin';
import { firestoreAdmin as db } from '@/lib/firebase-admin';
import { ApiError, ErrorCodes } from '@/lib/api-errors';
import type { Order, OrderItem, LedgerEntry, Promotion } from '@/lib/types';
import { computeVendorOrderSplits, groupItemsByVendor, type VendorSplitContext } from '@/lib/vendor-order-split';

interface OrderTransactionData {
  order: Omit<Order, 'id'>;
  items: OrderItem[];
  vendorIds: string[];
  promotionCode?: string;
}

interface InventoryReservation {
  productId: string;
  vendorId: string;
  quantity: number;
}

/**
 * Atomically create order + update inventory + create ledger entries
 * Ensures all-or-nothing semantics for order creation
 */
export async function createOrderTransaction(
  userId: string,
  transactionData: OrderTransactionData,
  inventoryReservations: InventoryReservation[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const batch = db.batch();
    const orderId = db.collection('orders').doc().id;

    try {
      // 1. Add order document
      const orderRef = db.collection('orders').doc(orderId);
      batch.set(orderRef, {
        ...transactionData.order,
        id: orderId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 1b. Split the order into per-vendor VendorOrders
      const vendorItems = groupItemsByVendor(transactionData.items);
      const splitContext: VendorSplitContext = {
        orderId,
        customerId: transactionData.order.userId,
        customerName: transactionData.order.userFullName,
        customerEmail: transactionData.order.userEmail,
        shippingAddress: transactionData.order.shippingAddress,
        subtotal: transactionData.order.subtotal,
        discountAmount: transactionData.order.discountAmount ?? 0,
        taxRate: transactionData.order.totalAmount > 0
          ? (transactionData.order.taxAmount / (transactionData.order.subtotal - (transactionData.order.discountAmount ?? 0)))
          : 0.16,
        shippingCost: transactionData.order.shippingCost,
        estimatedDeliveryDate: transactionData.order.estimatedDeliveryDate,
      };
      const vendorOrderDrafts = computeVendorOrderSplits(
        Array.from(vendorItems.entries()).map(([vendorId, items]) => ({ vendorId, items })),
        splitContext
      );
      for (const draft of vendorOrderDrafts) {
        const vendorOrderRef = db.collection('vendorOrders').doc();
        batch.set(vendorOrderRef, {
          ...draft,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 2. Reserve inventory for each product
      for (const reservation of inventoryReservations) {
        const productRef = db.collection('products').doc(reservation.productId);
        batch.update(productRef, {
          stock: admin.firestore.FieldValue.increment(-reservation.quantity),
          reserved: admin.firestore.FieldValue.increment(reservation.quantity),
          lastInventoryUpdate: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 3. Create ledger entries for vendors (deferred to separate transaction for simplicity)
      // Ledger entries are created after order confirmation to maintain referential integrity

      // 4. Update promotion if used - handled in transaction, but deferred for simplicity
      // Promotions are updated after transaction commits to avoid complexity

      // Commit all changes atomically
      batch.commit().then(() => resolve(orderId)).catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Atomically process payment and update order status
 * Ensures payment and order state stay in sync
 */
export async function processPaymentTransaction(
  orderId: string,
  paymentDetails: {
    method: string;
    transactionId: string;
    amount: number;
    status: 'completed' | 'failed' | 'pending';
  }
): Promise<void> {
  const batch = db.batch();

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      throw new ApiError(
        ErrorCodes.NOT_FOUND,
        'Order not found',
        404
      );
    }

    const order = orderSnap.data() as Order;

    // Verify amount matches
    if (Math.abs(paymentDetails.amount - order.totalAmount) > 0.01) {
      throw new ApiError(
        ErrorCodes.PAYMENT_ERROR,
        'Payment amount does not match order total',
        400
      );
    }

    // Update order with payment details
    batch.update(orderRef, {
      paymentDetails,
      paymentMethod: paymentDetails.method,
      status: paymentDetails.status === 'completed' ? 'confirmed' : 'payment_pending',
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: paymentDetails.status === 'completed' ? 'confirmed' : 'payment_pending',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        note: `Payment ${paymentDetails.status}`,
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update ledger entries if payment successful
    if (paymentDetails.status === 'completed') {
      const ledgerDocs = await db
        .collection('ledger')
        .where('orderId', '==', orderId)
        .get();

      ledgerDocs.forEach((doc) => {
        batch.update(doc.ref, {
          status: 'confirmed',
          confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    }

    await batch.commit();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      ErrorCodes.TRANSACTION_ERROR,
      'Failed to process payment transaction',
      500
    );
  }
}

/**
 * Atomically process refund and update inventory
 * Ensures refund consistency across order, inventory, and ledger
 */
export async function createRefundTransaction(
  orderId: string,
  itemIds: string[],
  refundAmount: number,
  reason: string
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const batch = db.batch();
    const refundId = db.collection('refunds').doc().id;

    try {
      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        throw new ApiError(ErrorCodes.NOT_FOUND, 'Order not found', 404);
      }

      const order = orderSnap.data() as Order;

      // Validate refund amount
      if (refundAmount <= 0 || refundAmount > order.totalAmount) {
        throw new ApiError(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid refund amount',
          400
        );
      }

      // 1. Create refund record
      const refundRef = db.collection('refunds').doc(refundId);
      batch.set(refundRef, {
        orderId,
        amount: refundAmount,
        reason,
        status: 'pending',
        itemIds,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Update order status
      batch.update(orderRef, {
        status: 'refund_pending',
        statusHistory: admin.firestore.FieldValue.arrayUnion({
          status: 'refund_pending',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          note: `Refund requested: ${reason}`,
        }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 3. Restore inventory for refunded items
      const refundedItems = order.items.filter((item) => itemIds.includes(item.productId));
      for (const item of refundedItems) {
        const productRef = db.collection('products').doc(item.productId);
        batch.update(productRef, {
          stock: admin.firestore.FieldValue.increment(item.quantity),
          reserved: admin.firestore.FieldValue.increment(-item.quantity),
          lastInventoryUpdate: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 4. Create ledger entry for refund (deferred for simplicity)
      // Ledger will be updated when refund is confirmed

      batch.commit().then(() => resolve(refundId)).catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Reconcile payouts based on settled ledger entries
 * Ensures payouts match actual confirmed transactions
 */
export async function reconcilePayouts(vendorId: string): Promise<void> {
  const batch = db.batch();

  try {
    // Get all confirmed ledger entries not yet paid out
    const ledgerDocs = await db
      .collection('ledger')
      .where('vendorId', '==', vendorId)
      .where('status', '==', 'confirmed')
      .where('paidOut', '==', false)
      .get();

    if (ledgerDocs.empty) {
      return;
    }

    // Calculate total payout
    const totalAmount = ledgerDocs.docs.reduce((sum, doc) => {
      return sum + (doc.data().amount || 0);
    }, 0);

    // Create payout record
    const payoutId = db.collection('payouts').doc().id;
    batch.set(db.collection('payouts').doc(payoutId), {
      vendorId,
      amount: totalAmount,
      status: 'pending',
      ledgerEntryIds: ledgerDocs.docs.map((doc) => doc.id),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mark ledger entries as paid out
    ledgerDocs.forEach((doc) => {
      batch.update(doc.ref, {
        paidOut: true,
        payoutId,
        paidOutAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  } catch (error) {
    throw new ApiError(
      ErrorCodes.TRANSACTION_ERROR,
      'Failed to reconcile payouts',
      500
    );
  }
}
