import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware'; 
import type { Order, LedgerEntry } from '@/lib/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Define OrderTracking type if not already imported
type OrderTracking = {
  status: Order['status'];
  timestamp: Date;
  note: string;
  updatedBy: string;
};

const ALLOWED_ORDER_STATUSES_FOR_UPDATE: Order['status'][] = [
  'pending',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
  'partially_refunded'
];

const ADMIN_ONLY_STATUSES: Order['status'][] = [
  'refunded',
  'partially_refunded'
];

const VENDOR_ALLOWED_STATUSES: Order['status'][] = [
  'processing',
  'shipped',
  'delivered'
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
async function getOrderHandler(req: AuthenticatedRequest, context: { params: { orderId: string } }) {
  const authenticatedUser = req.userProfile;
  const orderId = context.params.orderId;

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
async function updateOrderStatusHandler(req: AuthenticatedRequest, context: { params: { orderId: string } }) {
  const authenticatedUser = req.userProfile;
  const orderId = context.params.orderId;

  if (!orderId) {
    return NextResponse.json({ message: 'Order ID is missing.' }, { status: 400 });
  }

  try {
    const body = await req.json() as { status: Order['status'], note?: string };
    const { status, note } = body;

    if (!status || !ALLOWED_ORDER_STATUSES_FOR_UPDATE.includes(status)) {
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
        // Vendor can only update their own items' status
        if (!orderData.vendorIds?.includes(authenticatedUser.uid)) {
          throw new Error('Forbidden: This order does not contain items from your store.');
        }
        // Vendors can only update to certain statuses
        if (!VENDOR_ALLOWED_STATUSES.includes(status)) {
          throw new Error('Forbidden: Vendors cannot set this status.');
        }
      } else if (authenticatedUser.role !== 'admin') {
        throw new Error('Forbidden: You do not have permission to update order status.');
      }

      // Add tracking entry
      const tracking: OrderTracking = {
        status,
        timestamp: new Date(),
        note: note || `Status updated to ${status}`,
        updatedBy: authenticatedUser.uid,
      };

      // If order is being delivered, create financial transactions
      if (status === 'delivered' && orderData.status !== 'delivered') {
        for (const item of orderData.items) {
          if (item.vendorId) {
            const grossSaleAmount = item.price * item.quantity;
            const commissionAmount = grossSaleAmount * 0.10; // 10% platform fee
            const netAmount = grossSaleAmount - commissionAmount;

            // Create ledger entry for the vendor
            const ledgerEntry = {
              vendorId: item.vendorId,
              type: 'sale_credit',
              amount: grossSaleAmount,
              commissionRate: 0.10,
              commissionAmount,
              netAmount,
              orderId,
              productId: item.productId,
              createdAt: new Date(),
              description: `Sale of ${item.quantity}x ${item.name}`,
            };

            const ledgerRef = firestoreAdmin
              .collection('users')
              .doc(item.vendorId)
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
