
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest, type UserProfile } from '@/lib/authMiddleware';
import { Timestamp } from 'firebase-admin/firestore';

interface CartItem {
  productId: string;
  quantity: number;
  name: string; // Denormalized
  price: number; // Denormalized (price at the time of adding/last update)
  imageUrl?: string; // Denormalized
  dataAiHint?: string; // Denormalized
}

interface Cart {
  userId: string;
  items: CartItem[];
  updatedAt: Timestamp | Date;
}

interface ProductSnapshot {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  dataAiHint?: string;
  // other product fields if needed for validation, e.g., stock
}

async function getCartHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  try {
    const cartDocRef = firestoreAdmin.collection('carts').doc(authenticatedUser.uid);
    const cartDocSnap = await cartDocRef.get();

    if (!cartDocSnap.exists) {
      return NextResponse.json({ userId: authenticatedUser.uid, items: [], updatedAt: new Date() }, { status: 200 });
    }

    const cartData = cartDocSnap.data() as Cart;
    if (!cartData) {
        // This case is unlikely if doc exists, but a good safeguard.
        return NextResponse.json({ userId: authenticatedUser.uid, items: [], updatedAt: new Date() }, { status: 200 });
    }
    
    // Defensively handle date conversion to prevent crashes from malformed data
    const updatedAtRaw = cartData.updatedAt;
    let updatedAtClient: Date;

    if (updatedAtRaw instanceof Timestamp) {
        updatedAtClient = updatedAtRaw.toDate();
    } else if (updatedAtRaw) {
        const parsedDate = new Date(updatedAtRaw as any);
        // Use parsed date only if it's valid, otherwise default to now
        updatedAtClient = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();
    } else {
        // Fallback if the field doesn't exist at all
        updatedAtClient = new Date();
    }


    const clientCartData = {
        ...cartData,
        updatedAt: updatedAtClient,
        items: cartData.items || [], // Ensure items is always an array
    };

    return NextResponse.json(clientCartData, { status: 200 });
  } catch (error: any) {
    console.error(`Error fetching cart for user ${authenticatedUser.uid}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while fetching cart.' }, { status: 500 });
  }
}

export const GET = withAuth(getCartHandler);

interface SaveCartInputItem {
  productId: string;
  quantity: number;
}

async function saveCartHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  try {
    const body = await req.json() as { items: SaveCartInputItem[] };

    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json({ message: 'Invalid cart items payload. "items" must be an array.' }, { status: 400 });
    }
    
    const enrichedItems: CartItem[] = [];
    const productIds = body.items.map(item => item.productId);

    if (productIds.length > 0) {
        // Fetch all products in one go if possible, or iterate if product IDs are too many for a single 'in' query (max 30 for 'in' query).
        // For simplicity, fetching one by one, but batching is better for performance.
        for (const item of body.items) {
            if (item.quantity <= 0) continue; // Skip items with zero or negative quantity

            const productDocRef = firestoreAdmin.collection('products').doc(item.productId);
            const productDocSnap = await productDocRef.get();

            if (productDocSnap.exists) {
                const productData = productDocSnap.data() as ProductSnapshot;
                enrichedItems.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    name: productData.name,
                    price: productData.price, // Price at the time of saving cart
                    imageUrl: productData.imageUrl,
                    dataAiHint: productData.dataAiHint,
                });
            } else {
                console.warn(`Product with ID ${item.productId} not found while saving cart for user ${authenticatedUser.uid}. Skipping.`);
                // Optionally, notify the user that some items were not found
            }
        }
    }


    const cartData: Cart = {
      userId: authenticatedUser.uid,
      items: enrichedItems,
      updatedAt: new Date(), // Firestore will convert to Timestamp
    };

    const cartDocRef = firestoreAdmin.collection('carts').doc(authenticatedUser.uid);
    await cartDocRef.set(cartData);
    
    // Convert Firestore Timestamp to Date for client response consistency
    const clientCartData = {
        ...cartData,
        updatedAt: cartData.updatedAt instanceof Timestamp ? cartData.updatedAt.toDate() : new Date(cartData.updatedAt)
    };

    return NextResponse.json(clientCartData, { status: 200 });

  } catch (error: any)
{
    console.error(`Error saving cart for user ${authenticatedUser.uid}:`, error);
    if (error.type === 'entity.parse.failed' || error.message.includes('JSON')) {
      return NextResponse.json({ message: 'Invalid JSON payload for cart.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while saving cart.' }, { status: 500 });
  }
}

export const POST = withAuth(saveCartHandler);
