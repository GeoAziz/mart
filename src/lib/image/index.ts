/**
 * Image Management Library
 * 
 * Complete image selection system for products with:
 * - Intelligent query enhancement
 * - Multi-source fetching (Unsplash API)
 * - Relevance scoring engine
 * - Confidence-based selection
 * - Fallback strategy
 * 
 * Export all functions for external use
 */

export type { EnhancedQuery } from './enhanceQuery';
export { enhanceProductQuery, getBaseSearchTerm, generateFallbackQuery } from './enhanceQuery';

export type { UnsplashImage, ScoringResult } from './scoreImage';
export { scoreImage, selectBestImage, logScoringDetails } from './scoreImage';

export { fetchUnsplashImages, getRateLimitInfo, formatRateLimitInfo } from './fetchUnsplash';

export type { ProductImageResult } from './selectBestImage';
export { getProductImage, getBatchProductImages, isUnsplashUrl } from './selectBestImage';
