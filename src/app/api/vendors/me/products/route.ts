
'use server';

import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { UserProfile } from '@/lib/types';
import type { Product } from '@/app/api/products/route'; // Assuming Product type is exported from here

async function getVendorProductsHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  if (authenticatedUser.role !== 'vendor' && authenticatedUser.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden: Only vendors or admins can access this resource.' }, { status: 403 });
  }
  
  // If admin, they could potentially fetch for a specific vendorId if provided, or this route is strictly for 'me'
  // For 'me' route, it means the vendor's own products.
  const vendorIdToQuery = authenticatedUser.uid;


  try {
    const productsSnapshot = await firestoreAdmin.collection('products').where('vendorId', '==', vendorIdToQuery).get();
    const products: Product[] = productsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unnamed Product',
        description: data.description || '',
        price: data.price || 0,
        category: data.category || 'Uncategorized',
        stock: data.stock || 0,
        imageUrl: data.imageUrl || 'https://placehold.co/400x300/cccccc/E0E0E0?text=No+Image',
        brand: data.brand || 'Unknown Brand',
        dateAdded: data.dateAdded ? (data.dateAdded.toDate ? data.dateAdded.toDate() : new Date(data.dateAdded)) : new Date(),
        dataAiHint: data.dataAiHint || data.category?.toLowerCase().split(' ')[0] || "product",
        vendorId: data.vendorId,
        sku: data.sku || '', // Ensure SKU is part of the Product type if used
        status: data.status || 'active', // Default to 'active' or another appropriate default
      };
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error(`Error fetching products for vendor ${vendorIdToQuery} from Firestore:`, error);
    return NextResponse.json({ message: 'Error fetching products' }, { status: 500 });
  }
}

// Protect route for vendors and admins
export const GET = withAuth(getVendorProductsHandler, ['vendor', 'admin']);

