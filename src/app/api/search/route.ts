import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { searchProducts, getSearchSuggestions, isAlgoliaEnabled } from '@/lib/algolia-search-service';
import { firestoreAdmin } from '@/lib/firebase-admin';

/**
 * GET /api/search - Full-text search for products
 * Uses Algolia if configured, falls back to Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = searchParams.get('sortBy') as
      | 'relevance'
      | 'price-asc'
      | 'price-desc'
      | 'rating'
      | 'newest'
      | undefined;

    if (!query.trim()) {
      return NextResponse.json(
        { results: [], total: 0, message: 'Search query is required' },
        { status: 400 }
      );
    }

    // Try Algolia first if enabled
    if (isAlgoliaEnabled()) {
      const results = await searchProducts(query, {
        category: category || undefined,
        brand: brand || undefined,
        minPrice,
        maxPrice,
        limit,
        offset,
        sortBy: sortBy || 'relevance',
      });

      if (results) {
        return NextResponse.json(
          {
            results: results || [],
            total: results?.length || 0,
            source: 'algolia',
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
          }
        );
      }
    }

    // Fallback to Firestore full-text search
    console.log('[Search] Falling back to Firestore search');

    let firestoreQuery: FirebaseFirestore.Query = firestoreAdmin.collection('products').where(
      'status',
      '==',
      'active'
    );

    if (category) {
      firestoreQuery = firestoreQuery.where('category', '==', category);
    }
    if (brand) {
      firestoreQuery = firestoreQuery.where('brand', '==', brand);
    }

    const snapshot = await firestoreQuery.limit(limit * 3).get();
    let results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Client-side search filtering
    const lowerQuery = query.toLowerCase();
    results = results.filter(
      (product: any) =>
        product.name?.toLowerCase().includes(lowerQuery) ||
        product.description?.toLowerCase().includes(lowerQuery) ||
        product.category?.toLowerCase().includes(lowerQuery)
    );

    // Apply price filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      results = results.filter((product: any) => {
        const price = product.price || 0;
        return (minPrice === undefined || price >= minPrice) && (maxPrice === undefined || price <= maxPrice);
      });
    }

    // Apply sorting
    results.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'price-asc':
          return (a.price || 0) - (b.price || 0);
        case 'price-desc':
          return (b.price || 0) - (a.price || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'newest':
          return (b.dateAdded?.getTime?.() || 0) - (a.dateAdded?.getTime?.() || 0);
        default:
          return 0;
      }
    });

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);

    return NextResponse.json(
      {
        results: paginatedResults || [],
        total: results.length,
        source: 'firestore',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: any) {
    console.error('Error searching products:', error);
    return NextResponse.json(
      { message: 'Error searching products', error: error.message },
      { status: 500 }
    );
  }
}
