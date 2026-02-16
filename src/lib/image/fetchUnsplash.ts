/**
 * Unsplash API Interface
 * 
 * Fetches multiple product images from Unsplash API with:
 * - Per-page limiting to get multiple candidates
 * - High content filter to avoid explicit content
 * - Error handling and rate-limit awareness
 */

import { enhanceProductQuery } from './enhanceQuery';
import type { UnsplashImage } from './scoreImage';

// Configuration
const UNSPLASH_API_BASE = 'https://api.unsplash.com';
const RESULTS_PER_QUERY = 8; // Fetch 8 results to pick from
const REQUEST_TIMEOUT = 5000; // 5 seconds

let rateLimitInfo = {
  limit: 50,
  remaining: 50,
  reset: 0
};

/**
 * Get Unsplash API key from environment
 * Falls back gracefully if not configured
 */
function getApiKey(): string {
  const key = process.env.UNSPLASH_ACCESS_KEY || process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || '';
  
  if (!key) {
    console.warn(
      '⚠️  UNSPLASH_ACCESS_KEY not configured.\n' +
      'Using fallback image generation. For better results:\n' +
      '1. Get a free key: https://unsplash.com/api\n' +
      '2. Add UNSPLASH_ACCESS_KEY=your_key to .env\n'
    );
  }
  
  return key;
}

/**
 * Fetch multiple product images from Unsplash with query enhancement
 * 
 * API Limits:
 * - Unauthenticated: 50 requests/hour
 * - Authenticated: 5000 requests/hour
 */
export async function fetchUnsplashImages(
  productName: string,
  category: string,
  maxRetries: number = 2
): Promise<UnsplashImage[]> {
  const apiKey = getApiKey();
  
  // If no API key, return empty array (will use fallback)
  if (!apiKey) {
    return [];
  }

  try {
    // Enhance the query for better product photography focus
    const { query, filters } = enhanceProductQuery(productName, category);

    // Build search parameters
    const params = new URLSearchParams({
      query: query,
      per_page: RESULTS_PER_QUERY.toString(),
      order_by: 'relevant',
      content_filter: filters.contentFilter,
      orientation: filters.orientation as string,
    });

    // Make request
    const response = await fetch(
      `${UNSPLASH_API_BASE}/search/photos?${params.toString()}`,
      {
        headers: {
          'Authorization': `Client-ID ${apiKey}`,
          'Accept-Version': 'v1'
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT)
      }
    );

    // Track rate limits
    const limitHeader = response.headers.get('X-Ratelimit-Limit');
    const remainingHeader = response.headers.get('X-Ratelimit-Remaining');
    const resetHeader = response.headers.get('X-Ratelimit-Reset');

    if (limitHeader && remainingHeader && resetHeader) {
      rateLimitInfo = {
        limit: parseInt(limitHeader),
        remaining: parseInt(remainingHeader),
        reset: parseInt(resetHeader)
      };

      // Warn if approaching limit
      if (rateLimitInfo.remaining < 10) {
        console.warn(
          `⚠️  Unsplash API rate limit warning: ${rateLimitInfo.remaining}/${rateLimitInfo.limit} remaining`
        );
      }
    }

    // Handle errors
    if (!response.ok) {
      if (response.status === 401) {
        console.error('❌ Unsplash API: Invalid or expired API key');
        return [];
      }
      if (response.status === 429) {
        console.error('❌ Unsplash API: Rate limit exceeded');
        return [];
      }
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { results: any[] };
    
    if (!data.results || data.results.length === 0) {
      console.warn(`⚠️  No Unsplash results for: "${productName}"`);
      return [];
    }

    // Transform to our UnsplashImage type
    return data.results.map(result => ({
      id: result.id,
      urls: {
        small: result.urls.small,
        regular: result.urls.regular,
        full: result.urls.full
      },
      description: result.description,
      alt_description: result.alt_description,
      tags: result.tags || [],
      likes: result.likes || 0,
      downloads: result.downloads || 0,
      user: result.user ? { name: result.user.name } : undefined
    })) as UnsplashImage[];

  } catch (error: any) {
    // Handle timeout and network errors
    if (error.name === 'AbortError') {
      console.warn(`⚠️  Unsplash request timeout for "${productName}"`);
    } else {
      console.warn(`⚠️  Unsplash fetch failed for "${productName}":`, error.message);
    }

    // Retry logic (optional)
    if (maxRetries > 0 && error.name === 'AbortError') {
      console.log(`🔄 Retrying... (${maxRetries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      return fetchUnsplashImages(productName, category, maxRetries - 1);
    }

    return [];
  }
}

/**
 * Get current API rate limit info
 * Useful for monitoring
 */
export function getRateLimitInfo() {
  return { ...rateLimitInfo };
}

/**
 * Format rate limit info for display
 */
export function formatRateLimitInfo(): string {
  const { remaining, limit } = rateLimitInfo;
  const percentage = Math.round((remaining / limit) * 100);
  return `${remaining}/${limit} (${percentage}%) remaining`;
}
