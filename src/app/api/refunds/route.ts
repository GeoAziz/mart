
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { Timestamp } from 'firebase-admin/firestore';

export interface RefundRequest {
  id?: string; // Firestore document ID
  orderId: string;
  productId: string; // ID of the product being refunded
  productName: string; // Denormalized
  productImageUrl?: string; // Denormalized
  dataAiHint?: string; // Denormalized

  userId: string; // Customer's UID
  customerName: string; // Denormalized customer name
  customerEmail: string; // Denormalized customer email

  vendorId?: string; // UID of the vendor if it's a vendor product

  reason: string;
  requestedAmount: number;
  status: 'Pending' | 'Approved' | 'Denied' | 'Processing';
  requestedAt: Date | Timestamp;
  processedAt?: Date | Timestamp;
  adminNotes?: string;
  transactionId?: string; // For refund transaction, if applicable
}

// Helper to map Firestore doc to RefundRequest type for client
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


// GET handler to fetch all refund requests (admin only)
async function getAllRefundsHandler(req: AuthenticatedRequest) {
  try {
    const refundsSnapshot = await firestoreAdmin
      .collection('refunds')
      .orderBy('requestedAt', 'desc')
      .get();

    const refunds: RefundRequest[] = refundsSnapshot.docs.map(mapRefundDocument);
    return NextResponse.json(refunds, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching all refund requests for admin:', error);
    return NextResponse.json({ message: 'Internal Server Error while fetching refund requests.' }, { status: 500 });
  }
}

export const GET = withAuth(getAllRefundsHandler, 'admin');
    