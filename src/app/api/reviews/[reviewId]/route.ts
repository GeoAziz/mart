
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { Review } from '../../vendors/me/reviews/route'; // Import Review type
import type { Timestamp } from 'firebase-admin/firestore';


// PUT handler to update a review (e.g., add a reply)
async function updateReviewHandler(req: AuthenticatedRequest, context: { params: { reviewId: string } }) {
  const authenticatedUser = req.userProfile;
  const reviewId = context.params.reviewId;

  if (!reviewId) {
    return NextResponse.json({ message: 'Review ID is missing.' }, { status: 400 });
  }

  try {
    const body = await req.json() as { reply: string };
    const replyText = body.reply;

    if (typeof replyText !== 'string') {
      return NextResponse.json({ message: 'Reply text is missing or invalid.' }, { status: 400 });
    }

    const reviewDocRef = firestoreAdmin.collection('reviews').doc(reviewId);
    const reviewDocSnap = await reviewDocRef.get();

    if (!reviewDocSnap.exists) {
      return NextResponse.json({ message: 'Review not found.' }, { status: 404 });
    }

    const reviewData = reviewDocSnap.data() as Omit<Review, 'id' | 'createdAt' | 'repliedAt'> & { vendorId: string; createdAt: Timestamp; repliedAt?: Timestamp};

    // Authorization: Check if the review belongs to the authenticated vendor or if user is admin
    if (reviewData.vendorId !== authenticatedUser.uid && authenticatedUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: You do not have permission to reply to this review.' }, { status: 403 });
    }

    const updateData: { reply: string; repliedAt: Date } = {
      reply: replyText.trim(),
      repliedAt: new Date(), // Firestore will convert to Timestamp
    };

    await reviewDocRef.update(updateData);

    const updatedReviewSnap = await reviewDocRef.get();
    const data = updatedReviewSnap.data()!;
    const updatedReview: Review = {
        id: updatedReviewSnap.id,
        productId: data.productId,
        productName: data.productName,
        vendorId: data.vendorId,
        userId: data.userId,
        customerName: data.customerName,
        customerAvatar: data.customerAvatar,
        customerInitials: data.customerInitials,
        rating: data.rating,
        comment: data.comment,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        reply: data.reply,
        repliedAt: data.repliedAt?.toDate ? data.repliedAt.toDate() : new Date(data.repliedAt),
    };


    return NextResponse.json(updatedReview, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating review ${reviewId}:`, error);
    if (error.type === 'entity.parse.failed') {
      return NextResponse.json({ message: 'Invalid JSON payload for review update.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while updating review.' }, { status: 500 });
  }
}

export const PUT = withAuth(updateReviewHandler, ['vendor', 'admin']);


// GET handler for a single review (if needed in future, e.g., for sharing or direct linking)
export async function GET(request: NextRequest, { params }: { params: { reviewId: string } }) {
  const reviewId = params.reviewId;
  try {
    const reviewDoc = await firestoreAdmin.collection('reviews').doc(reviewId).get();

    if (!reviewDoc.exists) {
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    }
    const data = reviewDoc.data()!;
     const review: Review = {
        id: reviewDoc.id,
        productId: data.productId,
        productName: data.productName,
        vendorId: data.vendorId,
        userId: data.userId,
        customerName: data.customerName,
        customerAvatar: data.customerAvatar,
        customerInitials: data.customerInitials,
        rating: data.rating,
        comment: data.comment,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        reply: data.reply,
        repliedAt: data.repliedAt ? (data.repliedAt.toDate ? data.repliedAt.toDate() : new Date(data.repliedAt)) : undefined,
    };
    return NextResponse.json(review);
  } catch (error) {
    console.error(`Error fetching review ${reviewId}:`, error);
    return NextResponse.json({ message: 'Error fetching review' }, { status: 500 });
  }
}

// DELETE handler for admins to delete a review
async function deleteReviewHandler(req: AuthenticatedRequest, context: { params: { reviewId: string } }) {
  // withAuth middleware already ensures user is admin if this handler is reached with 'admin' role requirement
  const reviewId = context.params.reviewId;

  if (!reviewId) {
    return NextResponse.json({ message: 'Review ID is missing.' }, { status: 400 });
  }

  try {
    const reviewDocRef = firestoreAdmin.collection('reviews').doc(reviewId);
    const reviewDocSnap = await reviewDocRef.get();

    if (!reviewDocSnap.exists) {
      return NextResponse.json({ message: 'Review not found.' }, { status: 404 });
    }

    await reviewDocRef.delete();
    return NextResponse.json({ message: `Review ${reviewId} deleted successfully.` }, { status: 200 });

  } catch (error: any) {
    console.error(`Error deleting review ${reviewId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while deleting review.' }, { status: 500 });
  }
}

export const DELETE = withAuth(deleteReviewHandler, 'admin');
