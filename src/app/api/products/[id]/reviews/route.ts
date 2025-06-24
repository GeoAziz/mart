
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest, type UserProfile } from '@/lib/authMiddleware';
import type { Review as ReviewType } from '@/app/api/vendors/me/reviews/route'; // Using existing Review type
import type { Timestamp } from 'firebase-admin/firestore';
import type { Product } from '@/app/api/products/route'; // Import Product type

// Helper to map Firestore doc to ReviewType
function mapReviewDocument(doc: FirebaseFirestore.DocumentSnapshot): ReviewType {
  const data = doc.data() as Omit<ReviewType, 'id'>;
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
    repliedAt: data.repliedAt ? (data.repliedAt instanceof Timestamp ? data.repliedAt.toDate() : new Date(data.repliedAt)) : undefined,
  };
}

// GET handler to fetch reviews for a specific product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const productId = params.id;
  if (!productId) {
    return NextResponse.json({ message: 'Product ID is missing.' }, { status: 400 });
  }

  try {
    const reviewsSnapshot = await firestoreAdmin
      .collection('reviews')
      .where('productId', '==', productId)
      // .orderBy('createdAt', 'desc') // Removed to prevent composite index requirement
      .get();

    const reviews = reviewsSnapshot.docs.map(mapReviewDocument);
    
    // Sort in-memory after fetching
    reviews.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());

    return NextResponse.json(reviews, { status: 200 });
  } catch (error: any) {
    console.error(`Error fetching reviews for product ${productId}:`, error);
    // Add more specific error logging for future debugging
    if (error.code === 'failed-precondition') {
        console.error('Firestore query failed, likely due to a missing index. The code has been modified to sort in-memory to avoid this, but you may want to create the index in the Firebase console for performance on very large datasets.');
    }
    return NextResponse.json({ message: 'Internal Server Error while fetching reviews.' }, { status: 500 });
  }
}


interface SubmitReviewInput {
  rating: number;
  comment: string;
}

// POST handler for customers to submit a new review
async function submitReviewHandler(
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  const productId = params.id;
  const authenticatedUser = req.userProfile;

  if (!productId) {
    return NextResponse.json({ message: 'Product ID is missing.' }, { status: 400 });
  }

  try {
    const body = await req.json() as SubmitReviewInput;
    const { rating, comment } = body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ message: 'Rating must be a number between 1 and 5.' }, { status: 400 });
    }
    if (typeof comment !== 'string' || comment.trim().length === 0) {
      return NextResponse.json({ message: 'Comment cannot be empty.' }, { status: 400 });
    }
    if (comment.trim().length > 1000) { // Example length limit
        return NextResponse.json({ message: 'Comment is too long (max 1000 characters).' }, { status: 400 });
    }


    // Fetch product details for denormalization
    const productDocRef = firestoreAdmin.collection('products').doc(productId);
    const productDocSnap = await productDocRef.get();

    if (!productDocSnap.exists) {
      return NextResponse.json({ message: 'Product not found.' }, { status: 404 });
    }
    const productData = productDocSnap.data() as Product;

    // TODO: Future - Check if user purchased this product before allowing review

    const newReviewData: Omit<ReviewType, 'id' | 'repliedAt' | 'reply'> = {
      productId: productId,
      productName: productData.name || 'Unnamed Product', // Fallback for productName
      vendorId: productData.vendorId || 'unknown_vendor', // Fallback for vendorId
      userId: authenticatedUser.uid,
      customerName: authenticatedUser.fullName,
      customerInitials: authenticatedUser.fullName ? authenticatedUser.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : (authenticatedUser.email ? authenticatedUser.email.substring(0,2).toUpperCase() : 'U'),
      rating: rating,
      comment: comment.trim(),
      createdAt: new Date(), // Firestore will convert to Timestamp
    };

    const reviewDocRef = await firestoreAdmin.collection('reviews').add(newReviewData);
    const createdReview = { id: reviewDocRef.id, ...newReviewData };
    
    // Convert date for response consistency
    const responseReview: ReviewType = {
        ...createdReview,
        createdAt: new Date(createdReview.createdAt), // Ensure it's a Date object
    };

    return NextResponse.json(responseReview, { status: 201 });

  } catch (error: any) {
    console.error(`Error submitting review for product ${productId} by user ${authenticatedUser.uid}:`, error);
    if (error.type === 'entity.parse.failed') {
        return NextResponse.json({ message: 'Invalid JSON payload for review submission.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while submitting review.' }, { status: 500 });
  }
}

export const POST = withAuth(submitReviewHandler);
