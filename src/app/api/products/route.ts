
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest, type UserProfile } from '@/lib/authMiddleware';
import type { NextRequest } from 'next/server'; // Ensure NextRequest is imported
import type { Product, ProductStatus } from '@/lib/types';
import type { Timestamp } from 'firebase-admin/firestore';

// Helper to map Firestore doc to a client-friendly Product type
function mapProductDocument(doc: FirebaseFirestore.DocumentSnapshot): Product {
  const data = doc.data() as Omit<Product, 'id'>;
  return {
    id: doc.id,
    name: data.name || 'Unnamed Product',
    description: data.description || '',
    price: data.price || 0,
    category: data.category || 'Uncategorized',
    stock: data.stock === undefined ? 0 : data.stock,
    imageUrl: data.imageUrl || 'https://placehold.co/400x300/cccccc/E0E0E0?text=No+Image',
    additionalImageUrls: data.additionalImageUrls || [],
    brand: data.brand || 'Unknown Brand',
    dateAdded: data.dateAdded?.toDate ? data.dateAdded.toDate() : new Date(data.dateAdded || Date.now()),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
    dataAiHint: data.dataAiHint || data.category?.toLowerCase().split(' ')[0] || "product",
    vendorId: data.vendorId,
    status: data.status || 'pending_approval',
    sku: data.sku || '',
    rating: data.rating,
  };
}

// GET handler with server-side filtering, sorting, and pagination
export async function GET(request: NextRequest) {
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

    // Build a simpler base query
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
    
    // Fetch all documents that match the base query
    const snapshot = await query.get();
    let allProducts = snapshot.docs.map(mapProductDocument);

    // Apply filters that are difficult to combine in Firestore (price, rating) in-memory
    allProducts = allProducts.filter(p => {
        const priceMatch = (minPrice === null || p.price >= minPrice) && (maxPrice === null || p.price <= maxPrice);
        const ratingMatch = (rating === null || (p.rating && p.rating >= rating));
        return priceMatch && ratingMatch;
    });

    // In-memory sorting
    allProducts.sort((a, b) => {
        switch (sortBy) {
            case 'price-asc':
                return a.price - b.price;
            case 'price-desc':
                return b.price - a.price;
            case 'newest':
                const dateA = a.dateAdded instanceof Date ? a.dateAdded.getTime() : new Date(a.dateAdded || 0).getTime();
                const dateB = b.dateAdded instanceof Date ? b.dateAdded.getTime() : new Date(b.dateAdded || 0).getTime();
                return dateB - dateA;
            case 'rating':
                return (b.rating || 0) - (a.rating || 0);
            default:
                return a.name.localeCompare(b.name);
        }
    });

    // Pagination logic
    const totalProducts = allProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const offset = (page - 1) * limit;
    const paginatedProducts = allProducts.slice(offset, offset + limit);

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
