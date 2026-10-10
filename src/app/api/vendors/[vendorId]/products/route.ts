import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import type { Product } from '@/lib/types';

// In-memory index of mapProductDocument so we can reuse it from the
// public products route and the vendor-specific route without duplication.
// The products route exports it as a named import, but this is a separate
// entry point, so we re-declare it here to keep this file self-contained
// and avoid a circular dependency on '@/app/api/products/route'.

function convertTimestamp(ts: unknown): Date {
  if (ts instanceof Date) return ts;
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof (ts as { toDate: unknown }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate();
  }
  if (typeof ts === 'number') return new Date(ts);
  return new Date();
}

function mapProductDocument(doc: FirebaseFirestore.DocumentSnapshot): Product {
  const data = doc.data() as Omit<Product, 'id'>;

  return {
    id: doc.id,
    name: data.name || 'Unnamed Product',
    description: data.description || '',
    price: data.price || 0,
    category: data.category || 'Uncategorized',
    stock: data.stock ?? 0,
    lowStockThreshold: data.lowStockThreshold ?? undefined,
    imageUrl: data.imageUrl || 'https://placehold.co/400x300/cccccc/E0E0E0?text=No+Image',
    additionalImageUrls: data.additionalImageUrls || [],
    brand: data.brand || 'Unknown Brand',
    dateAdded: convertTimestamp(data.dateAdded),
    updatedAt: convertTimestamp(data.updatedAt),
    dataAiHint: data.dataAiHint || data.category?.toLowerCase().split(' ')[0] || 'product',
    vendorId: data.vendorId,
    status: data.status || 'pending_approval',
    sku: data.sku || '',
    rating: data.rating,
  };
}

async function getVendorProducts(vendorId: string): Promise<Product[]> {
  if (!firestoreAdmin) return [];

  try {
    // Scope the query to this vendor only. The `status` filter matches the
    // public catalog so storefronts only ever surface active, purchasable items.
    const snapshot = await firestoreAdmin
      .collection('products')
      .where('vendorId', '==', vendorId)
      .where('status', '==', 'active')
      .orderBy('dateAdded', 'desc')
      .get();

    return snapshot.docs.map(mapProductDocument);
  } catch (error) {
    console.error(`Error fetching products for vendor ${vendorId}:`, error);
    return [];
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ vendorId: string }> }
) {
  const { vendorId } = await context.params;

  if (!vendorId) {
    return NextResponse.json({ message: 'Vendor ID is required.' }, { status: 400 });
  }

  const products = await getVendorProducts(vendorId);

  return NextResponse.json(products);
}
