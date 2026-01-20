
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { Payout, LedgerEntry } from '@/lib/types';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';

const payoutUpdateSchema = z.object({
  status: z.enum(['Completed', 'Failed']),
  transactionId: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
});

function safeParseDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Timestamp) return value.toDate();
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
    return undefined;
}

function mapPayoutDocument(doc: FirebaseFirestore.DocumentSnapshot): Payout | null {
  const data = doc.data();
  if (!data) return null;

  const requestedDate = safeParseDate(data.requestedAt);
  if (!requestedDate) return null;

  return {
    id: doc.id,
    vendorId: data.vendorId,
    date: safeParseDate(data.date) || requestedDate,
    amount: data.amount,
    status: data.status || 'Pending',
    method: data.method,
    transactionId: data.transactionId,
    requestedAt: requestedDate,
    processedAt: safeParseDate(data.processedAt),
    adminNotes: data.adminNotes,
  };
}

// PUT handler to update a payout's status (admin only)
async function updatePayoutHandler(
  req: AuthenticatedRequest,
  context: { params: Promise<{ payoutId: string }> }
) {
  const { payoutId } = await context.params;
  if (!payoutId) {
    return NextResponse.json({ message: 'Payout ID is missing.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validationResult = payoutUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ message: "Validation failed", errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { status, transactionId, adminNotes } = validationResult.data;
    const payoutDocRef = firestoreAdmin.collection('payouts').doc(payoutId);

    await firestoreAdmin.runTransaction(async (transaction) => {
        const payoutDocSnap = await transaction.get(payoutDocRef);
        if (!payoutDocSnap.exists) {
            throw new Error('Payout request not found.');
        }

        const currentPayout = mapPayoutDocument(payoutDocSnap);
        if (!currentPayout) {
            throw new Error('Payout data is inconsistent.');
        }

        if (currentPayout.status !== 'Pending') {
            throw new Error(`Cannot process payout. Current status is already '${currentPayout.status}'.`);
        }

        const updateData: any = {
            status,
            processedAt: new Date(),
        };
        if (transactionId !== undefined) updateData.transactionId = transactionId;
        if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
        
        transaction.update(payoutDocRef, updateData);

        // --- NEW FINANCIAL LOGIC ---
        // If payout is completed, create a debit ledger entry for the vendor.
        if (status === 'Completed') {
            const ledgerEntry: Omit<LedgerEntry, 'id'> = {
                vendorId: currentPayout.vendorId,
                type: 'payout_debit',
                amount: currentPayout.amount,
                netAmount: -Math.abs(currentPayout.amount), // Ensure it's a negative value
                payoutId: payoutId,
                createdAt: new Date(),
                description: `Payout via ${currentPayout.method}. Txn: ${transactionId || 'N/A'}`,
            };
            const ledgerRef = firestoreAdmin.collection('users').doc(currentPayout.vendorId).collection('ledgerEntries').doc();
            transaction.set(ledgerRef, ledgerEntry);
        }
        // No ledger entry is created for a 'Failed' payout as no money has moved.
    });

    const updatedDocSnap = await payoutDocRef.get();
    const updatedPayoutResponse = mapPayoutDocument(updatedDocSnap);

    return NextResponse.json(updatedPayoutResponse, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating payout ${payoutId} for admin:`, error);
    if (error.message.includes('Payout request not found')) return NextResponse.json({ message: error.message }, { status: 404 });
    if (error.message.includes('Cannot process payout')) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ message: 'Internal Server Error while updating payout.' }, { status: 500 });
  }
}

export const PUT = withAuth(updatePayoutHandler, 'admin');
