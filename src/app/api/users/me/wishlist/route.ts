
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
// Remove type import for Timestamp to avoid duplicate/conflict
import type { Product } from '@/lib/types';

import { Timestamp } from 'firebase-admin/firestore';

export interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  rating?: number;
  dataAiHint?: string;
  addedAt: Date; // Client-side
}

interface WishlistItemFirestore extends Omit<WishlistItem, 'addedAt'> {
  addedAt: Timestamp; // Firestore-side
}

// Helper to map Firestore doc to Client WishlistItem type
function mapWishlistItemDocument(doc: FirebaseFirestore.DocumentSnapshot): WishlistItem {
  const data = doc.data() as WishlistItemFirestore;
  return {
    ...data,
    productId: doc.id, // productId is the document ID
    addedAt: data.addedAt.toDate(),
  };
}

// GET handler to fetch all wishlist items for the authenticated user
async function getWishlistHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  try {
    if (!firestoreAdmin) {
      return NextResponse.json({ message: 'Firestore is not initialized.' }, { status: 500 });
    }
    const wishlistSnapshot = await firestoreAdmin
      .collection('users')
      .doc(authenticatedUser.uid)
      .collection('wishlist')
      .orderBy('addedAt', 'desc')
      .get();

    const wishlistItems: WishlistItem[] = wishlistSnapshot.docs.map(mapWishlistItemDocument);
    return NextResponse.json(wishlistItems, { status: 200 });
  } catch (error: any) {
    console.error(`Error fetching wishlist for user ${authenticatedUser.uid}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while fetching wishlist.' }, { status: 500 });
  }
}
export const GET = withAuth(getWishlistHandler);


// POST handler to add a product to the user's wishlist
async function addWishlistItemHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  try {
    const body = await req.json() as { productId: string };
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ message: 'Product ID is required.' }, { status: 400 });
    }

    if (!firestoreAdmin) {
      return NextResponse.json({ message: 'Firestore is not initialized.' }, { status: 500 });
    }

    // Check if item already in wishlist to prevent duplicates (optional, or allow and handle on frontend)
    const wishlistItemRef = firestoreAdmin
      .collection('users')
      .doc(authenticatedUser.uid)
      .collection('wishlist')
      .doc(productId);
      
    const wishlistItemSnap = await wishlistItemRef.get();
    if (wishlistItemSnap.exists) {
        // Item already exists, return existing item
        return NextResponse.json(mapWishlistItemDocument(wishlistItemSnap), { status: 200 });
    }


    // Fetch product details for denormalization
    const productDocRef = firestoreAdmin.collection('products').doc(productId);
    const productDocSnap = await productDocRef.get();

    if (!productDocSnap.exists) {
      return NextResponse.json({ message: 'Product not found.' }, { status: 404 });
    }
    const productData = productDocSnap.data() as Product; // Assuming Product type

    const newWishlistItemData: Omit<WishlistItemFirestore, 'productId'> = {
      name: productData.name,
      price: productData.price,
      imageUrl: productData.imageUrl,
      category: productData.category,
      rating: productData.rating,
      dataAiHint: productData.dataAiHint,
      addedAt: Timestamp.now(),
    };

    await wishlistItemRef.set(newWishlistItemData);
    
    const createdWishlistItem: WishlistItem = {
        ...newWishlistItemData,
        productId: productId,
        addedAt: newWishlistItemData.addedAt.toDate(),
    };

    return NextResponse.json(createdWishlistItem, { status: 201 });

  } catch (error: any) {
    console.error(`Error adding item to wishlist for user ${authenticatedUser.uid}:`, error);
    if (error.type === 'entity.parse.failed') {
      return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while adding to wishlist.' }, { status: 500 });
  }
}
export const POST = withAuth(addWishlistItemHandler);
