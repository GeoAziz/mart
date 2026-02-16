/**
 * Product Image Selection Engine
 * 
 * Orchestrates the complete flow:
 * 1. Query Enhancement
 * 2. Unsplash API Fetch (8 results)
 * 3. Relevance Scoring
 * 4. Confidence Threshold Check
 * 5. Fallback to Placeholder if Low Confidence
 * 6. Cache Result
 */

import { enhanceProductQuery, getBaseSearchTerm, generateFallbackQuery } from './enhanceQuery';
import { fetchUnsplashImages } from './fetchUnsplash';
import { selectBestImage, logScoringDetails, type ScoringResult } from './scoreImage';

// Confidence threshold (0-21 scale)
const MIN_CONFIDENCE_SCORE = 4;

// Placeholder images per category
const PLACEHOLDER_IMAGES: Record<string, string> = {
  'Electronics': '/images/placeholders/electronics-placeholder.png',
  'Fashion': '/images/placeholders/fashion-placeholder.png',
  'Groceries': '/images/placeholders/groceries-placeholder.png',
  'Home & Kitchen': '/images/placeholders/home-kitchen-placeholder.png',
  'Health & Beauty': '/images/placeholders/health-beauty-placeholder.png',
  'Baby & Kids': '/images/placeholders/baby-kids-placeholder.png',
  'Automotive': '/images/placeholders/automotive-placeholder.png',
  'Sports & Outdoors': '/images/placeholders/sports-outdoors-placeholder.png',
  'Books & Stationery': '/images/placeholders/books-stationery-placeholder.png',
  'Tools & Industrial': '/images/placeholders/tools-industrial-placeholder.png',
  'default': '/images/placeholders/product-placeholder.png'
};

export interface ProductImageResult {
  url: string;
  source: 'unsplash' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  score: number;
  isPlaceholder: boolean;
  debugInfo?: {
    query: string;
    resultsFetched: number;
    scoringBreakdown: any;
  };
}

/**
 * Get the best available image for a product
 * 
 * This is the main entry point - handles all the logic internally
 */
export async function getProductImage(
  productName: string,
  category: string,
  debug: boolean = false
): Promise<ProductImageResult> {
  try {
    // 1. Enhance query
    const { query } = enhanceProductQuery(productName, category);

    if (debug) {
      console.log(`\n🔍 Getting image for: "${productName}" (${category})`);
      console.log(`📝 Enhanced query: "${query}"`);
    }

    // 2. Fetch from Unsplash
    const images = await fetchUnsplashImages(productName, category);

    if (debug) {
      console.log(`📡 Fetched ${images.length} candidates from Unsplash`);
    }

    // 3. If we got images, score and select best
    if (images.length > 0) {
      const bestResult = selectBestImage(images, productName, category, MIN_CONFIDENCE_SCORE);

      if (bestResult && bestResult.score >= MIN_CONFIDENCE_SCORE) {
        if (debug) {
          logScoringDetails(bestResult, productName);
        }

        return {
          url: bestResult.imageUrl,
          source: 'unsplash',
          confidence: bestResult.confidence,
          score: bestResult.score,
          isPlaceholder: false,
          debugInfo: debug ? {
            query,
            resultsFetched: images.length,
            scoringBreakdown: bestResult.breakdown
          } : undefined
        };
      }

      if (debug) {
        console.log(`⚠️  Score ${bestResult?.score || 0} below threshold (${MIN_CONFIDENCE_SCORE})`);
      }
    } else {
      if (debug) {
        console.log(`⚠️  No results from Unsplash API`);
      }
    }

    // 4. Fallback to placeholder
    const placeholder = PLACEHOLDER_IMAGES[category] || PLACEHOLDER_IMAGES['default'];

    if (debug) {
      console.log(`📦 Using placeholder: ${placeholder}`);
    }

    return {
      url: placeholder,
      source: 'fallback',
      confidence: 'low',
      score: 0,
      isPlaceholder: true,
      debugInfo: debug ? {
        query,
        resultsFetched: images.length,
        scoringBreakdown: null
      } : undefined
    };

  } catch (error: any) {
    console.error(`❌ Error getting product image for "${productName}":`, error.message);

    // Return fallback on any error
    const placeholder = PLACEHOLDER_IMAGES[category] || PLACEHOLDER_IMAGES['default'];
    return {
      url: placeholder,
      source: 'fallback',
      confidence: 'low',
      score: 0,
      isPlaceholder: true
    };
  }
}

/**
 * Batch get images for multiple products
 * More efficient than calling getProductImage individually for seeding
 */
export async function getBatchProductImages(
  products: Array<{ name: string; category: string }>,
  debug: boolean = false
): Promise<ProductImageResult[]> {
  if (debug) {
    console.log(`\n📦 Batch processing ${products.length} products...`);
  }

  const results = await Promise.all(
    products.map(product => 
      getProductImage(product.name, product.category, false)
    )
  );

  if (debug) {
    const unsplash = results.filter(r => r.source === 'unsplash').length;
    const fallback = results.filter(r => r.source === 'fallback').length;
    console.log(`✅ Batch complete: ${unsplash} Unsplash, ${fallback} Fallback`);
  }

  return results;
}

/**
 * Check if a URL is from Unsplash
 */
export function isUnsplashUrl(url: string): boolean {
  return url.includes('images.unsplash.com') || url.includes('source.unsplash.com');
}
