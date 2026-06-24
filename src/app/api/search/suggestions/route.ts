import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSearchSuggestions, isAlgoliaEnabled } from '@/lib/algolia-search-service';
import { firestoreAdmin } from '@/lib/firebase-admin';

/**
 * GET /api/search/suggestions - Get autocomplete suggestions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    if (!query.trim() || query.length < 2) {
      return NextResponse.json(
        { suggestions: [], message: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Try Algolia first if enabled
    if (isAlgoliaEnabled()) {
      const suggestions = await getSearchSuggestions(query, limit);

      if (suggestions) {
        return NextResponse.json(
          {
            suggestions: suggestions || [],
            source: 'algolia',
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
            },
          }
        );
      }
    }

    // Fallback to Firestore
    console.log('[Search] Falling back to Firestore suggestions');

    const lowerQuery = query.toLowerCase();
    const suggestions = new Set<string>();

    // Get matching product names
    const snapshot = await firestoreAdmin
      .collection('products')
      .where('status', '==', 'active')
      .limit(100)
      .get();

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as any;
      if (data.name?.toLowerCase().includes(lowerQuery)) {
        suggestions.add(data.name);
      }
      if (data.category?.toLowerCase().includes(lowerQuery)) {
        suggestions.add(data.category);
      }
      if (data.brand?.toLowerCase().includes(lowerQuery)) {
        suggestions.add(data.brand);
      }
    });

    const suggestionsArray = Array.from(suggestions).slice(0, limit);

    return NextResponse.json(
      {
        suggestions: suggestionsArray,
        source: 'firestore',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        },
      }
    );
  } catch (error: any) {
    console.error('Error getting search suggestions:', error);
    return NextResponse.json(
      { message: 'Error getting suggestions', error: error.message },
      { status: 500 }
    );
  }
}
