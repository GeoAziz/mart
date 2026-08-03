
'use server';

import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { requireVendor, requireAdmin } from '@/lib/authorization';
import { formatApiError } from '@/lib/api-errors';
import type { UserProfile } from '@/lib/types';
import type { Product } from '@/app/api/products/route';

async function getVendorProductsHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  if (authenticatedUser.role === 'vendor') {
    requireVendor(authenticatedUser);
  } else if (authenticatedUser.role === 'admin') {
    requireAdmin(authenticatedUser);
  } else {
    const { response } = formatApiError(new Error('Only vendors or admins can access this resource'));
    return response;
  }

  const vendorIdToQuery = authenticatedUser.uid;

  try {
    const productsSnapshot = await firestoreAdmin
      .collection('products')
      .where('vendorId', '==', vendorIdToQuery)
      .get();

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
        dataAiHint: data.dataAiHint || data.category?.toLowerCase().split(' ')[0] || 'product',
        vendorId: data.vendorId,
        sku: data.sku || '',
        status: data.status || 'active',
      };
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching vendor products:', error);
    const { response } = formatApiError(error);
    return response;
  }
}

// Protect route for vendors and admins
export const GET = withAuth(getVendorProductsHandler);

