
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { Payout, LedgerEntry } from '@/lib/types';

function safeParseDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Timestamp) return value.toDate();
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
    return undefined;
}

function mapPayoutDocument(doc: FirebaseFirestore.DocumentSnapshot): Payout {
  const data = doc.data() as Omit<Payout, 'id'|'date'|'requestedAt'> & { date: Timestamp, requestedAt: Timestamp};
  return {
    id: doc.id,
    ...data,
    date: data.date.toDate(),
    requestedAt: data.requestedAt.toDate(),
    processedAt: safeParseDate(data.processedAt),
  };
}

async function getVendorPayoutsHandler(req: AuthenticatedRequest) {
  const vendorId = req.userProfile.uid;
  try {
    const payoutsSnapshot = await firestoreAdmin
      .collection('payouts')
      .where('vendorId', '==', vendorId)
      .orderBy('date', 'desc')
      .get();
    const payouts: Payout[] = payoutsSnapshot.docs.map(mapPayoutDocument);
    return NextResponse.json(payouts, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Internal Server Error while fetching payout history.' }, { status: 500 });
  }
}

export const GET = withAuth(getVendorPayoutsHandler, ['vendor', 'admin']);

const requestPayoutSchema = z.object({
  amount: z.number().positive("Payout amount must be positive."),
  method: z.string().min(1, "Payout method is required."),
});

async function requestPayoutHandler(req: AuthenticatedRequest) {
  const vendorId = req.userProfile.uid;
  try {
    const body = await req.json();
    const validationResult = requestPayoutSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ message: "Validation failed", errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    const { amount: requestedAmount, method } = validationResult.data;

    // --- NEW: Calculate available balance using the Ledger ---
    const ledgerSnapshot = await firestoreAdmin.collection('users').doc(vendorId).collection('ledgerEntries').get();
    const availableBalance = ledgerSnapshot.docs.reduce((sum, doc) => {
      const entry = doc.data() as LedgerEntry;
      return sum + entry.netAmount;
    }, 0);

    if (requestedAmount > availableBalance) {
      return NextResponse.json({ message: `Requested amount (KSh ${requestedAmount.toLocaleString()}) exceeds available balance (KSh ${availableBalance.toLocaleString()}).` }, { status: 400 });
    }

    const newPayoutDocRef = firestoreAdmin.collection('payouts').doc();
    const now = Timestamp.now();
    const newPayoutData = {
      vendorId: vendorId,
      amount: requestedAmount,
      method: method,
      status: 'Pending' as Payout['status'],
      date: now,
      requestedAt: now,
    };
    await newPayoutDocRef.set(newPayoutData);

    // DEBIT the ledger for the pending payout immediately to prevent double-spending
     const ledgerEntry: Omit<LedgerEntry, 'id'> = {
        vendorId: vendorId,
        type: 'payout_debit',
        amount: requestedAmount,
        netAmount: -Math.abs(requestedAmount), // Debit from balance
        payoutId: newPayoutDocRef.id,
        createdAt: new Date(),
        description: `Payout request created via ${method}.`,
    };
    const ledgerRef = firestoreAdmin.collection('users').doc(vendorId).collection('ledgerEntries').doc();
    await ledgerRef.set(ledgerEntry);


    const createdPayoutForResponse = {
      id: newPayoutDocRef.id,
      ...newPayoutData,
      date: newPayoutData.date.toDate(),
      requestedAt: newPayoutData.requestedAt.toDate(),
    };

    return NextResponse.json({
        message: 'Payout request submitted successfully. It will be processed by an admin.',
        payout: createdPayoutForResponse
    }, { status: 201 });

  } catch (error: any) {
    console.error(`Error requesting payout for vendor ${vendorId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while requesting payout.' }, { status: 500 });
  }
}

export const POST = withAuth(requestPayoutHandler, ['vendor']);
