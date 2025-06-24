
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';

// DELETE handler to remove a product from the user's wishlist
async function deleteWishlistItemHandler(
  req: AuthenticatedRequest,
  context: { params: { productId: string } }
) {
  const authenticatedUser = req.userProfile;
  const { productId } = context.params;

  if (!productId) {
    return NextResponse.json({ message: 'Product ID is missing.' }, { status: 400 });
  }

  try {
    const wishlistItemRef = firestoreAdmin
      .collection('users')
      .doc(authenticatedUser.uid)
      .collection('wishlist')
      .doc(productId);

    const docSnap = await wishlistItemRef.get();
    if (!docSnap.exists) {
        return NextResponse.json({ message: 'Item not found in wishlist.' }, { status: 404 });
    }

    await wishlistItemRef.delete();
    return NextResponse.json({ message: 'Item removed from wishlist successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error(`Error removing item ${productId} from wishlist for user ${authenticatedUser.uid}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while removing from wishlist.' }, { status: 500 });
  }
}
export const DELETE = withAuth(deleteWishlistItemHandler);
