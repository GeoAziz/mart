
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { requireVendor, requireAdmin } from '@/lib/authorization';
import { formatApiError } from '@/lib/api-errors';
import type { Timestamp } from 'firebase-admin/firestore';
import { toDate } from '@/lib/date';

// Define Review interface, assuming it might be shared or defined elsewhere eventually
export interface Review {
  id: string;
  productId: string;
  productName: string;
  vendorId: string;
  userId: string;
  customerName: string | null;
  customerAvatar?: string;
  customerInitials?: string;
  rating: number;
  comment: string;
  createdAt: Date | Timestamp;
  reply?: string;
  repliedAt?: Date | Timestamp;
}

function mapReviewDocument(doc: FirebaseFirestore.DocumentSnapshot): Review {
  const data = doc.data() as Omit<Review, 'id'>;
  return {
    id: doc.id,
    ...data,
    createdAt: toDate(data.createdAt) ?? new Date(Date.now()),
    repliedAt: data.repliedAt ? (toDate(data.repliedAt) ?? undefined) : undefined,
  };
}

// GET handler to fetch reviews for the authenticated vendor's products
async function getVendorReviewsHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const vendorId = authenticatedUser.uid;

  try {
    requireVendor(authenticatedUser || req.userProfile);
    const reviewsSnapshot = await firestoreAdmin
      .collection('reviews')
      .where('vendorId', '==', vendorId)
      .get();

    const reviews = reviewsSnapshot.docs.map(mapReviewDocument);
    reviews.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any).toMillis();
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any).toMillis();
      return bTime - aTime;
    });
    return NextResponse.json(reviews, { status: 200 });

  } catch (error: any) {
    console.error(`Error fetching reviews for vendor ${vendorId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while fetching reviews.' }, { status: 500 });
  }
}

export const GET = withAuth(getVendorReviewsHandler, ['vendor', 'admin']); // Allow admins to see this too if needed for impersonation/support
