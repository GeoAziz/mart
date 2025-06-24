
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { Payout } from '@/app/api/vendors/me/payouts/route';
import { Timestamp } from 'firebase-admin/firestore';

// Helper function for safe date parsing
function safeParseDate(value: any, docIdForLogging: string, fieldNameForLogging: string): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Timestamp) {
        return value.toDate();
    }
    const d = new Date(value as string | number | Date);
    if (!isNaN(d.getTime())) {
        return d;
    }
    // console.warn(`Document ${docIdForLogging} has invalid '${fieldNameForLogging}', returning undefined.`);
    return undefined;
}

// Helper to map Firestore doc to Payout type
function mapPayoutDocument(doc: FirebaseFirestore.DocumentSnapshot): Payout | null {
  const data = doc.data();

  if (!data) {
    console.warn(`Payout document ${doc.id} has no data. Skipping.`);
    return null;
  }

  const payoutDate = safeParseDate(data.date, doc.id, 'date');
  const requestedDate = safeParseDate(data.requestedAt, doc.id, 'requestedAt');
  
  if (!payoutDate) {
    console.warn(`Payout document ${doc.id} is missing or has invalid 'date'. Skipping.`);
    return null;
  }
  if (!requestedDate) {
    console.warn(`Payout document ${doc.id} is missing or has invalid 'requestedAt'. Skipping.`);
    return null;
  }
  if (typeof data.vendorId !== 'string' || !data.vendorId) {
    console.warn(`Payout document ${doc.id} is missing or has invalid 'vendorId'. Skipping.`);
    return null;
  }
  if (typeof data.amount !== 'number' || isNaN(data.amount)) {
    console.warn(`Payout document ${doc.id} is missing or has invalid 'amount'. Skipping.`);
    return null;
  }
  const status = data.status as Payout['status'];
  if (!['Pending', 'Completed', 'Failed'].includes(status)) {
    console.warn(`Payout document ${doc.id} has invalid or missing 'status'. Will default to 'Pending' if possible, but indicates data issue.`);
  }
  if (typeof data.method !== 'string' || !data.method) {
    console.warn(`Payout document ${doc.id} is missing or has invalid 'method'. Skipping.`);
    return null;
  }

  return {
    id: doc.id,
    vendorId: data.vendorId,
    date: payoutDate,
    amount: data.amount,
    status: ['Pending', 'Completed', 'Failed'].includes(status) ? status : 'Pending',
    method: data.method,
    transactionId: typeof data.transactionId === 'string' ? data.transactionId : undefined,
    requestedAt: requestedDate,
    processedAt: safeParseDate(data.processedAt, doc.id, 'processedAt'),
    // adminNotes can be optional, so we don't strictly require it.
    adminNotes: typeof (data as any).adminNotes === 'string' ? (data as any).adminNotes : undefined,
  };
}

// GET handler to fetch all payout requests (admin only)
async function getAllPayoutsHandler(req: AuthenticatedRequest) {
  try {
    const payoutsSnapshot = await firestoreAdmin
      .collection('payouts')
      .orderBy('requestedAt', 'desc') 
      .get();

    const payouts: Payout[] = payoutsSnapshot.docs
        .map(doc => mapPayoutDocument(doc))
        .filter(p => p !== null) as Payout[];

    return NextResponse.json(payouts, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching all payout requests for admin:', error);
    return NextResponse.json({ message: 'Internal Server Error while fetching payout requests.' }, { status: 500 });
  }
}

export const GET = withAuth(getAllPayoutsHandler, 'admin');
    
