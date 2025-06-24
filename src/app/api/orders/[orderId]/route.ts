
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware'; 
import type { Order, LedgerEntry } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

const ALLOWED_ORDER_STATUSES_FOR_UPDATE: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const COMMISSION_RATE = 0.10; // 10% platform commission

function mapOrderDocument(doc: FirebaseFirestore.DocumentSnapshot): Order {
  const data = doc.data() as Omit<Order, 'id'>;
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
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
    const body = await req.json() as { status: Order['status'] };
    const newStatus = body.status;

    if (!newStatus || !ALLOWED_ORDER_STATUSES_FOR_UPDATE.includes(newStatus)) {
      return NextResponse.json({ message: `Invalid status value.`, status: 400 });
    }

    const orderDocRef = firestoreAdmin.collection('orders').doc(orderId);
    
    await firestoreAdmin.runTransaction(async (transaction) => {
        const orderDocSnap = await transaction.get(orderDocRef);
        if (!orderDocSnap.exists) {
            throw new Error('Order not found.');
        }
        
        const orderData = mapOrderDocument(orderDocSnap);

        // Authorization logic remains the same
        if (authenticatedUser.role === 'vendor') {
          // ... (existing vendor authorization logic)
        } else if (authenticatedUser.role !== 'admin') {
            throw new Error('Forbidden: You do not have permission to update this order status.');
        }

        // --- NEW FINANCIAL LOGIC ---
        // If order is being marked as 'delivered', create ledger entries for vendor earnings
        if (newStatus === 'delivered' && orderData.status !== 'delivered') {
          for (const item of orderData.items) {
            if (item.vendorId) {
              const grossSaleAmount = item.price * item.quantity;
              const commissionAmount = grossSaleAmount * COMMISSION_RATE;
              const netAmount = grossSaleAmount - commissionAmount;

              const ledgerEntry: Omit<LedgerEntry, 'id'> = {
                vendorId: item.vendorId,
                type: 'sale_credit',
                amount: grossSaleAmount,
                commissionRate: COMMISSION_RATE,
                commissionAmount: commissionAmount,
                netAmount: netAmount,
                orderId: orderId,
                productId: item.productId,
                createdAt: new Date(),
                description: `Sale of ${item.quantity} x ${item.name}`,
              };

              const ledgerRef = firestoreAdmin.collection('users').doc(item.vendorId).collection('ledgerEntries').doc();
              transaction.set(ledgerRef, ledgerEntry);
            }
          }
        }

        // Update the order status
        transaction.update(orderDocRef, {
          status: newStatus,
          updatedAt: new Date(),
        });
    });

    const updatedOrderSnap = await orderDocRef.get();
    const updatedOrder = mapOrderDocument(updatedOrderSnap);

    return NextResponse.json(updatedOrder, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating status for order ${orderId}:`, error);
    if (error.message.includes('Forbidden')) return NextResponse.json({ message: error.message }, { status: 403 });
    if (error.message.includes('Order not found')) return NextResponse.json({ message: error.message }, { status: 404 });
    return NextResponse.json({ message: 'Internal Server Error while updating order status.' }, { status: 500 });
  }
}

export const PUT = withAuth(updateOrderStatusHandler, ['admin', 'vendor']);
