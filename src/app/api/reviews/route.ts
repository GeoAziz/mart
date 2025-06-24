
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { Review } from '../vendors/me/reviews/route'; // Using existing Review type
import type { Timestamp } from 'firebase-admin/firestore';

// Helper to map Firestore doc to ReviewType
function mapReviewDocument(doc: FirebaseFirestore.DocumentSnapshot): Review {
  const data = doc.data() as Omit<Review, 'id'>;
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
    repliedAt: data.repliedAt ? (data.repliedAt instanceof Timestamp ? data.repliedAt.toDate() : new Date(data.repliedAt)) : undefined,
  };
}

// GET handler for admins to fetch all reviews
async function getAllReviewsHandler(req: AuthenticatedRequest) {
  // withAuth middleware already ensures user is admin if this handler is reached with 'admin' role requirement
  try {
    const reviewsSnapshot = await firestoreAdmin
      .collection('reviews')
      .orderBy('createdAt', 'desc')
      .get();

    const reviews = reviewsSnapshot.docs.map(mapReviewDocument);
    return NextResponse.json(reviews, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching all reviews for admin:', error);
    return NextResponse.json({ message: 'Internal Server Error while fetching all reviews.' }, { status: 500 });
  }
}

export const GET = withAuth(getAllReviewsHandler, 'admin');
