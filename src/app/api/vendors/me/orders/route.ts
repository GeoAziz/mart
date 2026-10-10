'use server';

import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { requireVendor } from '@/lib/authorization';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { VendorOrder, VendorOrderStatus, LedgerEntry } from '@/lib/types';
import { validateStatusTransition } from '@/lib/order-state-machine';
import { deriveParentOrderStatus } from '@/lib/order-state-machine';
import { writeAuditLog } from '@/lib/audit-log';

const VENDOR_FULFILLMENT_STATUSES: VendorOrderStatus[] = [
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

function mapVendorOrderDocument(doc: FirebaseFirestore.DocumentSnapshot): VendorOrder {
  const data = doc.data() as Omit<VendorOrder, 'id'>;
  return {
    id: doc.id,
    ...data,
    items: data.items || [],
    statusHistory: data.statusHistory || [],
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
  };
}

async function getVendorOrdersHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  try {
    requireVendor(authenticatedUser);
    const vendorOrdersSnapshot = await firestoreAdmin
      .collection('vendorOrders')
      .where('vendorId', '==', authenticatedUser.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const vendorOrders = vendorOrdersSnapshot.docs.map(mapVendorOrderDocument);

    return NextResponse.json(vendorOrders);
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    return NextResponse.json({ message: 'Failed to fetch orders' }, { status: 500 });
  }
}

async function updateOrderStatusHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  try {
    requireVendor(authenticatedUser);
    const { orderId, status, note } = await req.json();

    if (!orderId || !status) {
      return NextResponse.json({ message: 'Order ID and status are required' }, { status: 400 });
    }

    if (!VENDOR_FULFILLMENT_STATUSES.includes(status as VendorOrderStatus)) {
      return NextResponse.json({ message: `Vendors cannot set status to "${status}"` }, { status: 400 });
    }

    const vendorOrderRef = firestoreAdmin.collection('vendorOrders').doc(orderId);
    const vendorOrderDoc = await vendorOrderRef.get();

    if (!vendorOrderDoc.exists) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const vendorOrderData = mapVendorOrderDocument(vendorOrderDoc);
    if (vendorOrderData.vendorId !== authenticatedUser.uid) {
      return NextResponse.json({ message: 'Unauthorized to update this order' }, { status: 403 });
    }

    const nextStatus = status as VendorOrderStatus;
    validateStatusTransition(vendorOrderData.status, nextStatus);

    await firestoreAdmin.runTransaction(async (transaction) => {
      const snap = await transaction.get(vendorOrderRef);
      if (!snap.exists) {
        throw new Error('Order not found');
      }
      const current = mapVendorOrderDocument(snap);

      const tracking = {
        status: nextStatus,
        timestamp: new Date(),
        note: note || `Status updated to ${nextStatus}`,
        updatedBy: authenticatedUser.uid,
      };

      transaction.update(vendorOrderRef, {
        status: nextStatus,
        statusHistory: FieldValue.arrayUnion(tracking),
        updatedAt: Timestamp.now(),
        ...(nextStatus === 'delivered' ? { actualDeliveryDate: Timestamp.now() } : {}),
      });

      // Credit the vendor ledger once their portion is delivered.
      if (nextStatus === 'delivered' && current.status !== 'delivered') {
        const ledgerEntry: Omit<LedgerEntry, 'id' | 'createdAt'> = {
          vendorId: current.vendorId,
          type: 'sale_credit',
          amount: current.subtotal,
          commissionRate: current.commissionRate,
          commissionAmount: current.commissionAmount,
          netAmount: current.netAmount,
          orderId: current.orderId,
          status: 'confirmed',
          description: `Sale of ${current.items.reduce((sum, i) => sum + i.quantity, 0)} items`,
        };

        const ledgerRef = firestoreAdmin
          .collection('users')
          .doc(current.vendorId)
          .collection('ledgerEntries')
          .doc();
        transaction.set(ledgerRef, {
          ...ledgerEntry,
          createdAt: Timestamp.now(),
        });
      }

      // Propagate a derived status to the parent order.
      const parentOrderRef = firestoreAdmin.collection('orders').doc(current.orderId);
      const siblingSnapshot = await transaction.get(
        firestoreAdmin.collection('vendorOrders').where('orderId', '==', current.orderId)
      );
      const siblingStatuses: VendorOrderStatus[] = siblingSnapshot.docs.map(
        (d) => (d.data() as VendorOrder).status
      );
      const derivedStatus = deriveParentOrderStatus(siblingStatuses);

      if (derivedStatus) {
        transaction.update(parentOrderRef, {
          status: derivedStatus,
          updatedAt: Timestamp.now(),
          statusHistory: FieldValue.arrayUnion({
            status: derivedStatus,
            timestamp: new Date(),
            note: `Parent order status derived from vendor order ${orderId}`,
            updatedBy: authenticatedUser.uid,
          }),
        });
      }
    });

    await writeAuditLog({
      actor: authenticatedUser.uid,
      role: authenticatedUser.role,
      action: 'vendor_order_status_changed',
      resourceType: 'vendorOrder',
      resourceId: orderId,
      before: { status: vendorOrderData.status },
      after: { status: nextStatus, note: note ?? null },
    });

    return NextResponse.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    if (error instanceof Error && error.name === 'StatusTransitionError') {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json({ message: 'Failed to update order status' }, { status: 500 });
  }
}

export const GET = withAuth(getVendorOrdersHandler, ['vendor', 'admin']);
export const PUT = withAuth(updateOrderStatusHandler, ['vendor', 'admin']);
