
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import type { RefundRequest, Order, LedgerEntry } from '@/lib/types';

const refundUpdateSchema = z.object({
  status: z.enum(['Approved', 'Denied', 'Processing']),
  adminNotes: z.string().optional().nullable(),
  transactionId: z.string().optional().nullable(),
});

function mapRefundDocument(doc: FirebaseFirestore.DocumentSnapshot): RefundRequest {
  const data = doc.data() as Omit<RefundRequest, 'id' | 'requestedAt' | 'processedAt'> & {
    requestedAt: Timestamp | Date;
    processedAt?: Timestamp | Date;
  };
  return {
    id: doc.id,
    ...data,
    requestedAt: data.requestedAt instanceof Timestamp ? data.requestedAt.toDate() : new Date(data.requestedAt),
    processedAt: data.processedAt ? (data.processedAt instanceof Timestamp ? data.processedAt.toDate() : new Date(data.processedAt)) : undefined,
  };
}

const COMMISSION_RATE = 0.10; // Must be consistent with order creation logic

async function updateRefundHandler(
  req: AuthenticatedRequest,
  context: { params: Promise<{ refundId: string }> }
) {
  const { refundId } = await context.params;
  if (!refundId) {
    return NextResponse.json({ message: 'Refund ID is missing.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validationResult = refundUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ message: "Validation failed", errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { status, adminNotes, transactionId } = validationResult.data;
    const refundDocRef = firestoreAdmin.collection('refunds').doc(refundId);

    await firestoreAdmin.runTransaction(async (transaction) => {
        const refundDocSnap = await transaction.get(refundDocRef);
        if (!refundDocSnap.exists) {
            throw new Error('Refund request not found.');
        }

        const refundData = refundDocSnap.data() as RefundRequest;
        if (refundData.status !== 'Pending' && refundData.status !== 'Processing') {
             throw new Error(`Cannot update refund. Current status is already '${refundData.status}'.`);
        }

        // --- NEW FINANCIAL & ORDER LOGIC (for 'Approved' status) ---
        if (status === 'Approved' && refundData.vendorId) {
            // 1. Create a debit ledger entry for the vendor
            const grossRefundAmount = refundData.requestedAmount;
            const refundedCommission = grossRefundAmount * COMMISSION_RATE;
            const netDebitAmount = grossRefundAmount - refundedCommission;
            
            const ledgerEntry: Omit<LedgerEntry, 'id'> = {
                vendorId: refundData.vendorId,
                type: 'refund_debit',
                amount: grossRefundAmount,
                commissionRate: COMMISSION_RATE,
                commissionAmount: refundedCommission,
                netAmount: -Math.abs(netDebitAmount), // Debit vendor for the amount they received
                orderId: refundData.orderId,
                productId: refundData.productId,
                refundId: refundId,
                createdAt: new Date(),
                description: `Refund for ${refundData.productName} (Order: ${refundData.orderId.substring(0,7)}...)`,
            };
            const ledgerRef = firestoreAdmin.collection('users').doc(refundData.vendorId).collection('ledgerEntries').doc();
            transaction.set(ledgerRef, ledgerEntry);

            // 2. Update the corresponding order item's refund status
            const orderDocRef = firestoreAdmin.collection('orders').doc(refundData.orderId);
            const orderDocSnap = await transaction.get(orderDocRef);
            if (orderDocSnap.exists) {
                const orderData = orderDocSnap.data() as Order;
                const updatedItems = orderData.items.map(item => {
                    if (item.productId === refundData.productId) {
                        return { ...item, refundStatus: 'approved' as const };
                    }
                    return item;
                });

                // 3. Check if all items are refunded to update the main order status
                const allItemsRefunded = updatedItems.every(item => item.refundStatus === 'approved');
                if (allItemsRefunded) {
                    transaction.update(orderDocRef, { items: updatedItems, status: 'refunded', updatedAt: new Date() });
                } else {
                    transaction.update(orderDocRef, { items: updatedItems, updatedAt: new Date() });
                }
            }
            // 4. Placeholder for triggering actual payment gateway refund to customer
            // console.log(`Triggering payment gateway refund of ${grossRefundAmount} for order ${refundData.orderId}`);
        }

        // Finally, update the refund request document itself
        const updatePayload: any = { status, processedAt: new Date() };
        if (adminNotes !== undefined) updatePayload.adminNotes = adminNotes;
        if (transactionId !== undefined && status === 'Approved') updatePayload.transactionId = transactionId;
        transaction.update(refundDocRef, updatePayload);
    });

    const updatedDocSnap = await refundDocRef.get();
    const updatedRefundResponse = mapRefundDocument(updatedDocSnap);

    return NextResponse.json(updatedRefundResponse, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating refund ${refundId} for admin:`, error);
    if (error.message.includes('not found')) return NextResponse.json({ message: error.message }, { status: 404 });
    if (error.message.includes('Cannot update')) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ message: 'Internal Server Error while updating refund.' }, { status: 500 });
  }
}

export const PUT = withAuth(updateRefundHandler, 'admin');
