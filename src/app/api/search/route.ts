import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { searchProducts, isAlgoliaEnabled } from '@/lib/algolia-search-service';
import { applyRateLimit, rateLimitPresets } from '@/lib/rate-limiter';
import { withRequestMetrics } from '@/lib/api-metrics';

/**
 * GET /api/search - Full-text search for products via Algolia.
 *
 * Returns 503 when Algolia is not configured rather than silently falling back
 * to Firestore. Firestore does not support full-text search natively; the two
 * sources produce inconsistent results, which is a worse UX than an honest error.
 */
async function searchHandler(request: NextRequest) {
  const limited = await applyRateLimit(request, rateLimitPresets.public);
  if (limited) return limited;

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

    if (!isAlgoliaEnabled()) {
      return NextResponse.json(
        {
          results: [],
          total: 0,
          message:
            'Full-text search is unavailable. Configure ALGOLIA_APP_ID, ALGOLIA_API_KEY, and ALGOLIA_INDEX_NAME to enable it.',
        },
        { status: 503 }
      );
    }

    const results = await searchProducts(query, {
      category: category || undefined,
      brand: brand || undefined,
      minPrice,
      maxPrice,
      limit,
      offset,
      sortBy: sortBy || 'relevance',
    });

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
  } catch (error: any) {
    console.error('Error searching products:', error);
    return NextResponse.json(
      { message: 'Error searching products', error: error.message },
      { status: 500 }
    );
  }
}

export const GET = withRequestMetrics(searchHandler);
