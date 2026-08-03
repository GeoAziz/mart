import { syncCache as cacheService } from '@/lib/cache-service';
import { firestoreAdmin as db } from '@/lib/firebase-admin';
import type { Product } from '@/lib/types';

/**
 * Caching Strategy for Products & Categories
 * Multi-layer caching with cache invalidation
 */

const CACHE_KEYS = {
  PRODUCTS_ALL: 'products:all',
  PRODUCTS_BY_VENDOR: 'products:vendor:',
  PRODUCTS_BY_CATEGORY: 'products:category:',
  CATEGORIES_ALL: 'categories:all',
  PRODUCT_DETAIL: 'product:detail:',
  VENDOR_PROFILE: 'vendor:profile:',
} as const;

const CACHE_TTL = {
  PRODUCT_CATALOG: 3600, // 1 hour - products change relatively slowly
  PRODUCT_DETAIL: 1800, // 30 minutes - product details
  CATEGORIES: 7200, // 2 hours - categories rarely change
  VENDOR_PROFILE: 3600, // 1 hour
} as const;

/**
 * Cache all products with pagination
 */
export async function cacheProductsPage(
  pageKey: string,
  products: Product[],
  ttl: number = CACHE_TTL.PRODUCT_CATALOG
): Promise<void> {
  const cacheKey = `${CACHE_KEYS.PRODUCTS_ALL}:${pageKey}`;
  cacheService.set(cacheKey, products, ttl);
}

/**
 * Get cached products page
 */
export function getCachedProductsPage(pageKey: string): Product[] | undefined {
  const cacheKey = `${CACHE_KEYS.PRODUCTS_ALL}:${pageKey}`;
  return cacheService.get<Product[]>(cacheKey);
}

/**
 * Cache products by vendor
 */
export async function cacheVendorProducts(
  vendorId: string,
  products: Product[],
  ttl: number = CACHE_TTL.PRODUCT_CATALOG
): Promise<void> {
  const cacheKey = `${CACHE_KEYS.PRODUCTS_BY_VENDOR}${vendorId}`;
  cacheService.set(cacheKey, products, ttl);
}

/**
 * Get cached vendor products
 */
export function getCachedVendorProducts(vendorId: string): Product[] | undefined {
  const cacheKey = `${CACHE_KEYS.PRODUCTS_BY_VENDOR}${vendorId}`;
  return cacheService.get<Product[]>(cacheKey);
}

/**
 * Cache products by category
 */
export async function cacheProductsByCategory(
  category: string,
  products: Product[],
  ttl: number = CACHE_TTL.PRODUCT_CATALOG
): Promise<void> {
  const cacheKey = `${CACHE_KEYS.PRODUCTS_BY_CATEGORY}${category}`;
  cacheService.set(cacheKey, products, ttl);
}

/**
 * Get cached products by category
 */
export function getCachedProductsByCategory(category: string): Product[] | undefined {
  const cacheKey = `${CACHE_KEYS.PRODUCTS_BY_CATEGORY}${category}`;
  return cacheService.get<Product[]>(cacheKey);
}

/**
 * Cache product detail
 */
export async function cacheProductDetail(
  productId: string,
  product: Product,
  ttl: number = CACHE_TTL.PRODUCT_DETAIL
): Promise<void> {
  const cacheKey = `${CACHE_KEYS.PRODUCT_DETAIL}${productId}`;
  cacheService.set(cacheKey, product, ttl);
}

/**
 * Get cached product detail
 */
export function getCachedProductDetail(productId: string): Product | undefined {
  const cacheKey = `${CACHE_KEYS.PRODUCT_DETAIL}${productId}`;
  return cacheService.get<Product>(cacheKey);
}

/**
 * Invalidate product caches when product is updated
 */
export async function invalidateProductCaches(productId: string, vendorId?: string): Promise<void> {
  // Invalidate product detail
  cacheService.invalidate(`${CACHE_KEYS.PRODUCT_DETAIL}${productId}`);

  // Invalidate vendor products if vendor ID provided
  if (vendorId) {
    cacheService.invalidate(`${CACHE_KEYS.PRODUCTS_BY_VENDOR}${vendorId}`);
  }

  // Invalidate all products pages
  cacheService.invalidatePattern(CACHE_KEYS.PRODUCTS_ALL);
}

/**
 * Invalidate category cache when products in that category change
 */
export async function invalidateCategoryCaches(category: string): Promise<void> {
  cacheService.invalidate(`${CACHE_KEYS.PRODUCTS_BY_CATEGORY}${category}`);
  cacheService.invalidatePattern(CACHE_KEYS.PRODUCTS_ALL);
}

/**
 * Invalidate all product caches (use sparingly)
 */
export async function invalidateAllProductCaches(): Promise<void> {
  cacheService.invalidatePattern(CACHE_KEYS.PRODUCTS_ALL);
  cacheService.invalidatePattern(CACHE_KEYS.PRODUCTS_BY_VENDOR);
  cacheService.invalidatePattern(CACHE_KEYS.PRODUCTS_BY_CATEGORY);
  cacheService.invalidatePattern(CACHE_KEYS.PRODUCT_DETAIL);
}

/**
 * Cache categories list
 */
export async function cacheCategories(
  categories: string[],
  ttl: number = CACHE_TTL.CATEGORIES
): Promise<void> {
  cacheService.set(CACHE_KEYS.CATEGORIES_ALL, categories, ttl);
}

/**
 * Get cached categories
 */
export function getCachedCategories(): string[] | undefined {
  return cacheService.get<string[]>(CACHE_KEYS.CATEGORIES_ALL);
}

/**
 * Invalidate categories cache
 */
export async function invalidateCategoriesList(): Promise<void> {
  cacheService.invalidate(CACHE_KEYS.CATEGORIES_ALL);
}

/**
 * Cache vendor profile
 */
export async function cacheVendorProfile(
  vendorId: string,
  profile: any,
  ttl: number = CACHE_TTL.VENDOR_PROFILE
): Promise<void> {
  const cacheKey = `${CACHE_KEYS.VENDOR_PROFILE}${vendorId}`;
  cacheService.set(cacheKey, profile, ttl);
}

/**
 * Get cached vendor profile
 */
export function getCachedVendorProfile(vendorId: string): any | undefined {
  const cacheKey = `${CACHE_KEYS.VENDOR_PROFILE}${vendorId}`;
  return cacheService.get<any>(cacheKey);
}

/**
 * Invalidate vendor profile cache
 */
export async function invalidateVendorProfileCache(vendorId: string): Promise<void> {
  cacheService.invalidate(`${CACHE_KEYS.VENDOR_PROFILE}${vendorId}`);
  cacheService.invalidate(`${CACHE_KEYS.PRODUCTS_BY_VENDOR}${vendorId}`);
}

/**
 * Warm up cache for popular products
 * Call this on application startup or periodic intervals
 */
export async function warmProductCache(): Promise<void> {
  try {
    // Cache top products (by rating or sales)
    const topProducts = await db
      .collection('products')
      .where('status', '==', 'active')
      .orderBy('rating', 'desc')
      .limit(20)
      .get();

    const products = topProducts.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Product));

    await cacheProductsPage('top', products);

    console.log('Product cache warmed up with top products');
  } catch (error) {
    console.error('Failed to warm product cache:', error);
  }
}
