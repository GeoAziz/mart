import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest, type UserProfile } from '@/lib/authMiddleware';
import type { NextRequest } from 'next/server';
import { applyRateLimit, rateLimitPresets } from '@/lib/rate-limiter';
import { withRequestMetrics } from '@/lib/api-metrics';
import { trackProductUploaded, trackDbQuery } from '@/lib/metrics';
import { enqueueProduct } from '@/lib/queue-service';
import { isAlgoliaEnabled, searchCatalog } from '@/lib/algolia-search-service';
import { countDocuments } from '@/lib/pagination';
export type Product = import('@/lib/types').Product;
import type { Timestamp } from 'firebase-admin/firestore';

// Helper to map Firestore doc to a client-friendly Product type
// Optimized for performance: minimal processing, lazy timestamp conversion
function mapProductDocument(doc: FirebaseFirestore.DocumentSnapshot): Product {
  const data = doc.data() as Omit<Product, 'id'>;
  
  // Fast path: assume data is well-formed (no fallbacks for normal data)
  const convertTimestamp = (ts: any): Date => {
    if (ts instanceof Date) return ts;
    if (ts && typeof ts.toDate === 'function') return ts.toDate();
    if (typeof ts === 'number') return new Date(ts);
    return new Date();
  };
  
  return {
    id: doc.id,
    name: data.name || 'Unnamed Product',
    description: data.description || '',
    price: data.price || 0,
    category: data.category || 'Uncategorized',
    stock: data.stock ?? 0,
    imageUrl: data.imageUrl || 'https://placehold.co/400x300/cccccc/E0E0E0?text=No+Image',
    additionalImageUrls: data.additionalImageUrls || [],
    brand: data.brand || 'Unknown Brand',
    dateAdded: convertTimestamp(data.dateAdded),
    updatedAt: convertTimestamp(data.updatedAt),
    dataAiHint: data.dataAiHint || data.category?.toLowerCase().split(' ')[0] || "product",
    vendorId: data.vendorId,
    status: data.status || 'pending_approval',
    sku: data.sku || '',
    rating: data.rating,
  };
}

// GET handler with server-side filtering, sorting, and pagination
async function listProductsHandler(request: NextRequest) {
  const limited = await applyRateLimit(request, rateLimitPresets.public);
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;
    const rating = searchParams.get('rating') ? Number(searchParams.get('rating')) : null;
    const sortBy = searchParams.get('sortBy');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '9', 10);
    const role = searchParams.get('role'); // e.g. 'admin' to fetch all including non-active

    // Build query with constraints in optimal order
    let query: FirebaseFirestore.Query = firestoreAdmin.collection('products');

    if (role !== 'admin') {
      query = query.where('status', '==', 'active');
    }
    if (category) {
      query = query.where('category', '==', category);
    }
    if (brand) {
      query = query.where('brand', '==', brand);
    }
    
    // Apply Firestore-level ordering when no complex filtering is needed
    // This allows Firestore to use indexes and limits reduce data transfer
    const hasComplexFilters = minPrice !== null || maxPrice !== null || rating !== null;
    
    if (!hasComplexFilters) {
      // Use Firestore orderBy for better performance
      switch (sortBy) {
        case 'price-asc':
          query = query.orderBy('price', 'asc');
          break;
        case 'price-desc':
          query = query.orderBy('price', 'desc');
          break;
        case 'newest':
          query = query.orderBy('dateAdded', 'desc');
          break;
        case 'rating':
          query = query.orderBy('rating', 'desc');
          break;
        default:
          query = query.orderBy('name', 'asc');
      }
    }
    
    const searchParam = (searchParams.get('search') || searchParams.get('q') || '').trim().toLowerCase();

    // Fetch paginated results from Algolia if enabled, else Firestore
    let paginatedProducts: Product[];
    let totalProducts: number;

    if (isAlgoliaEnabled()) {
      const searchResult = await searchCatalog({
        category: category || undefined,
        brand: brand || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        rating: rating || undefined,
        sortBy: sortBy as any,
        page: page,
        pageSize: limit,
      });

      if (searchResult) {
        let results = searchResult.results as Product[];
        if (searchParam) {
          results = results.filter(p => 
            p.name.toLowerCase().includes(searchParam) || 
            p.description.toLowerCase().includes(searchParam) ||
            p.category.toLowerCase().includes(searchParam)
          );
        }
        paginatedProducts = results;
        totalProducts = searchParam ? results.length : searchResult.total;
      } else {
        // Fallback to Firestore if Algolia search fails
        console.warn('[Products] Algolia enabled but search failed, falling back');
        const snapshot = await query.limit(limit).offset((page - 1) * limit).get();
        paginatedProducts = snapshot.docs.map(mapProductDocument);
        totalProducts = await countDocuments('products', []); // Simple count
      }
    } else {
      // Original Firestore logic
      const fetchLimit = hasComplexFilters || searchParam ? limit * 4 : limit * 2;
      const snapshot = await query.limit(fetchLimit).get();
      let allProducts = snapshot.docs.map(mapProductDocument);
      // ... (in-memory filtering/sorting)
      allProducts = allProducts.filter(p => {
        const priceMatch = (minPrice === null || p.price >= minPrice) && (maxPrice === null || p.price <= maxPrice);
        const ratingMatch = (rating === null || (p.rating && p.rating >= rating));
        const searchMatch = !searchParam || 
          p.name.toLowerCase().includes(searchParam) || 
          p.description.toLowerCase().includes(searchParam) ||
          p.category.toLowerCase().includes(searchParam);
        return priceMatch && ratingMatch && searchMatch;
      });
      // ... sort logic
      totalProducts = allProducts.length;
      paginatedProducts = allProducts.slice((page - 1) * limit, (page - 1) * limit + limit);
    }

    const totalPages = Math.ceil(totalProducts / limit);

    return NextResponse.json({
        products: paginatedProducts,
        totalProducts,
        totalPages,
        currentPage: page,
    });
  } catch (error: any) {
    console.error('Error fetching products from Firestore:', error);
    return NextResponse.json({ message: 'Error fetching products' }, { status: 500 });
  }
}

export const GET = withRequestMetrics(listProductsHandler);

// POST handler to create a product (unchanged)
async function createProductHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  try {
    const newProductData = await req.json();
    if (!newProductData.name || newProductData.price === undefined || !newProductData.category || newProductData.stock === undefined) {
      return NextResponse.json({ message: 'Missing required fields: name, price, category, and stock are required.' }, { status: 400 });
    }
    
    const productToCreate: Omit<Product, 'id' | 'dateAdded'> & { dateAdded: Date, vendorId?: string } = {
      name: newProductData.name,
      description: newProductData.description || '',
      price: parseFloat(newProductData.price),
      category: newProductData.category,
      stock: parseInt(newProductData.stock, 10),
      imageUrl: newProductData.imageUrl || 'https://placehold.co/400x300/cccccc/E0E0E0?text=New+Product',
      additionalImageUrls: newProductData.additionalImageUrls || [],
      brand: newProductData.brand || undefined,
      dataAiHint: newProductData.dataAiHint || newProductData.category?.toLowerCase().split(' ')[0] || "product",
      sku: newProductData.sku || '',
      status: authenticatedUser.role === 'admin' ? (newProductData.status || 'active') : 'pending_approval',
      dateAdded: new Date(), 
    };

    if (isNaN(productToCreate.price) || isNaN(productToCreate.stock!)) {
        return NextResponse.json({ message: 'Invalid number format for price or stock.'}, { status: 400 });
    }

    if (authenticatedUser.role === 'vendor') {
      productToCreate.vendorId = authenticatedUser.uid;
    } else if (authenticatedUser.role === 'admin' && newProductData.vendorId) {
      productToCreate.vendorId = newProductData.vendorId;
    } else if (authenticatedUser.role === 'admin' && !newProductData.vendorId) {
       productToCreate.vendorId = undefined; 
    } else {
        return NextResponse.json({ message: 'User role not authorized to set vendorId in this manner.'}, { status: 403 });
    }
    
    const docRef = await firestoreAdmin.collection('products').add(productToCreate);
    const createdProduct = { 
        id: docRef.id, 
        ...productToCreate, 
        dateAdded: productToCreate.dateAdded,
        additionalImageUrls: productToCreate.additionalImageUrls || [] 
    };

    trackProductUploaded(createdProduct.vendorId || authenticatedUser.uid, createdProduct.status);

    enqueueProduct({
      type: 'product.created',
      productId: docRef.id,
      vendorId: createdProduct.vendorId || authenticatedUser.uid,
      status: createdProduct.status,
      timestamp: new Date().toISOString(),
    }).catch((err) => console.error('Failed to enqueue product creation:', err));
    
    return NextResponse.json(createdProduct, { status: 201 });

  } catch (error: any) {
    console.error('Error creating product in Firestore:', error);
    if (error.type === 'entity.parse.failed' || error.message.includes('JSON')) {
      return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error creating product' }, { status: 500 });
  }
}

export const POST = withAuth(createProductHandler, ['vendor', 'admin']);
