import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { Order, LedgerEntry, VendorOrder } from '@/lib/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { writeAuditLog } from '@/lib/audit-log';
import { validateStatusTransition } from '@/lib/order-state-machine';
import { PLATFORM_COMMISSION_RATE } from '@/lib/vendor-order-split';
import { restoreStockForOrder } from '@/lib/inventory';
import { enqueueOrder } from '@/lib/queue-service';

// Define OrderTracking type if not already imported
type OrderTracking = {
  status: Order['status'];
  timestamp: Date;
  note: string;
  updatedBy: string;
};

const ADMIN_ONLY_STATUSES: Order['status'][] = [
  'refunded',
  'partially_refunded',
];

const VENDOR_ALLOWED_STATUSES: Order['status'][] = [
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
];

function mapOrderDocument(doc: FirebaseFirestore.DocumentSnapshot): Order {
  const data = doc.data() as Omit<Order, 'id'>;
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
    items: data.items || [],
    vendorIds: data.vendorIds || [],
  };
}

// GET Handler remains the same
async function getOrderHandler(req: AuthenticatedRequest, context: { params: Promise<{ orderId: string }> }) {
  const authenticatedUser = req.userProfile;
  const orderId = (await context.params).orderId;

  if (!orderId) {
    return NextResponse.json({ message: 'Order ID is missing.' }, { status: 400 });
  }

  try {
    const orderDocRef = firestoreAdmin.collection('orders').doc(orderId);
    const orderDocSnap = await orderDocRef.get();

    if (!orderDocSnap.exists) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    const order = mapOrderDocument(orderDocSnap);

    if (authenticatedUser.role === 'admin') {
      // Admin can access any order
    } else if (authenticatedUser.role === 'customer') {
      if (order.userId !== authenticatedUser.uid) {
        return NextResponse.json({ message: 'Forbidden: You do not have permission to view this order.' }, { status: 403 });
      }
    } else if (authenticatedUser.role === 'vendor') {
      if (!order.vendorIds || !order.vendorIds.includes(authenticatedUser.uid)) {
        return NextResponse.json({ message: 'Forbidden: This order does not contain items from your store.' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ message: 'Forbidden: You do not have permission to view this order due to an unknown role.' }, { status: 403 });
    }

    return NextResponse.json(order, { status: 200 });

  } catch (error: any) {
    console.error(`Error fetching order ${orderId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while fetching order.' }, { status: 500 });
  }
}

export const GET = withAuth(getOrderHandler);

// PUT Handler now includes financial logic
async function updateOrderStatusHandler(req: AuthenticatedRequest, context: { params: Promise<{ orderId: string }> }) {
  const authenticatedUser = req.userProfile;
  const orderId = (await context.params).orderId;

  if (!orderId) {
    return NextResponse.json({ message: 'Order ID is missing.' }, { status: 400 });
  }

  try {
    const body = await req.json() as { status: Order['status'], note?: string };
    const { status, note } = body;

    if (!status) {
      return NextResponse.json({ message: `Invalid status value.`, status: 400 });
    }

    // Admin can update to any status
    if (authenticatedUser.role !== 'admin') {
      if (ADMIN_ONLY_STATUSES.includes(status)) {
        return NextResponse.json({ message: 'This status update requires admin privileges.' }, { status: 403 });
      }
    }

    const orderDocRef = firestoreAdmin.collection('orders').doc(orderId);
    
    await firestoreAdmin.runTransaction(async (transaction) => {
      const orderDocSnap = await transaction.get(orderDocRef);
      if (!orderDocSnap.exists) {
        throw new Error('Order not found.');
      }
      
      const orderData = mapOrderDocument(orderDocSnap);

      // Authorization checks
      if (authenticatedUser.role === 'vendor') {
        if (!orderData.vendorIds?.includes(authenticatedUser.uid)) {
          throw new Error('Forbidden: This order does not contain items from your store.');
        }
        if (!VENDOR_ALLOWED_STATUSES.includes(status)) {
          throw new Error('Forbidden: Vendors cannot set this status.');
        }
      } else if (authenticatedUser.role !== 'admin') {
        throw new Error('Forbidden: You do not have permission to update order status.');
      }

      // Enforce the unified state machine
      validateStatusTransition(orderData.status, status);

      // Add tracking entry
      const tracking: OrderTracking = {
        status,
        timestamp: new Date(),
        note: note || `Status updated to ${status}`,
        updatedBy: authenticatedUser.uid,
      };

      // If order is being delivered, create financial transactions
      if (status === 'delivered' && orderData.status !== 'delivered') {
        const vendorOrderSnap = await transaction.get(
          firestoreAdmin.collection('vendorOrders').where('orderId', '==', orderId)
        );
        const vendorOrders = vendorOrderSnap.docs.map((d) => d.data() as VendorOrder);

        if (vendorOrders.length > 0) {
          for (const vendorOrder of vendorOrders) {
            if (vendorOrder.status === 'delivered' || vendorOrder.status === 'refunded' || vendorOrder.status === 'cancelled') {
              continue;
            }
            const ledgerEntry = {
              vendorId: vendorOrder.vendorId,
              type: 'sale_credit',
              amount: vendorOrder.subtotal,
              commissionRate: vendorOrder.commissionRate,
              commissionAmount: vendorOrder.commissionAmount,
              netAmount: vendorOrder.netAmount,
              orderId,
              productId: vendorOrder.items[0]?.productId,
              createdAt: new Date(),
              status: 'confirmed',
              description: `Sale of ${vendorOrder.items.reduce((sum, i) => sum + i.quantity, 0)} items`,
            };

            const ledgerRef = firestoreAdmin
              .collection('users')
              .doc(vendorOrder.vendorId)
              .collection('ledgerEntries')
              .doc();

            transaction.set(ledgerRef, ledgerEntry);

            // Mark the vendor order delivered in the same transaction
            transaction.update(firestoreAdmin.collection('vendorOrders').doc(vendorOrder.id!), {
              status: 'delivered',
              statusHistory: FieldValue.arrayUnion(tracking),
              actualDeliveryDate: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
          }
        } else {
          // Legacy orders without vendorOrders: fall back to per-item grouping.
          const grouped = new Map<string, { subtotal: number; count: number }>();
          for (const item of orderData.items) {
            if (!item.vendorId) continue;
            const entry = grouped.get(item.vendorId) ?? { subtotal: 0, count: 0 };
            entry.subtotal += item.price * item.quantity;
            entry.count += item.quantity;
            grouped.set(item.vendorId, entry);
          }

          for (const [vendorId, totals] of grouped) {
            const grossSaleAmount = totals.subtotal;
            const commissionAmount = grossSaleAmount * PLATFORM_COMMISSION_RATE;
            const netAmount = grossSaleAmount - commissionAmount;

            const ledgerEntry = {
              vendorId,
              type: 'sale_credit',
              amount: grossSaleAmount,
              commissionRate: PLATFORM_COMMISSION_RATE,
              commissionAmount,
              netAmount,
              orderId,
              createdAt: new Date(),
              status: 'confirmed',
              description: `Sale of ${totals.count} items`,
            };

            const ledgerRef = firestoreAdmin
              .collection('users')
              .doc(vendorId)
              .collection('ledgerEntries')
              .doc();

            transaction.set(ledgerRef, ledgerEntry);
          }
        }
      }

      // Update the order
      transaction.update(orderDocRef, {
        status,
        statusHistory: FieldValue.arrayUnion(tracking),
        updatedAt: new Date(),
      });
    });

    const updatedOrderSnap = await orderDocRef.get();
    const updatedOrder = mapOrderDocument(updatedOrderSnap);

    await writeAuditLog({
      actor: authenticatedUser.uid,
      role: authenticatedUser.role,
      action: 'order_status_changed',
      resourceType: 'order',
      resourceId: orderId,
      before: { status: updatedOrder.statusHistory.at(-2)?.status ?? 'unknown' },
      after: { status, note: note ?? null },
    });

    // Restore inventory when an order is cancelled or refunded.
    if (status === 'cancelled' || status === 'refunded') {
      await restoreStockForOrder(orderId);
    }

    // Async pipeline: notify the customer of the status change.
    enqueueOrder({
      type: status === 'shipped' ? 'order.shipped' : status === 'delivered' ? 'order.delivered' : 'order.updated',
      orderId,
      vendorId: updatedOrder.vendorIds?.[0] || 'unknown',
      vendorIds: updatedOrder.vendorIds || [],
      customerId: updatedOrder.userId,
      totalAmount: updatedOrder.totalAmount,
      timestamp: new Date().toISOString(),
    }).catch((err) => console.error('Failed to enqueue order status event:', err));

    return NextResponse.json(updatedOrder, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating status for order ${orderId}:`, error);
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error.message.includes('Order not found')) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { message: 'Internal Server Error while updating order status.' },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(updateOrderStatusHandler, ['admin', 'vendor']);
