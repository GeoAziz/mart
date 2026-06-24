/**
 * Products Catalog Service
 * Handles product listings with caching and optimizations
 */

import { firestoreAdmin } from '@/lib/firebase-admin';
import { cacheAside, cacheClearPattern } from '@/lib/cache-service';
import type { Product } from '@/lib/types';

const CACHE_KEYS = {
  CATEGORIES: 'catalog:categories',
  BRANDS: 'catalog:brands',
  PRODUCT_LIST: (params: string) => `catalog:products:${params}`,
};

const CACHE_TTL = {
  CATEGORIES: 3600, // 1 hour
  BRANDS: 3600, // 1 hour
  PRODUCT_LIST: 600, // 10 minutes (products update more frequently)
};

/**
 * Get all active product categories with counts
 */
export async function getProductCategories(): Promise<
  Array<{ name: string; count: number }>
> {
  return cacheAside(
    CACHE_KEYS.CATEGORIES,
    async () => {
      const snapshot = await firestoreAdmin
        .collection('products')
        .where('status', '==', 'active')
        .select('category')
        .get();

      const categoryCounts = new Map<string, number>();

      snapshot.docs.forEach((doc) => {
        const category = (doc.data() as any).category || 'Uncategorized';
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });

      return Array.from(categoryCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
    CACHE_TTL.CATEGORIES
  ) as Promise<Array<{ name: string; count: number }>>;
}

/**
 * Get all active product brands with counts
 */
export async function getProductBrands(): Promise<
  Array<{ name: string; count: number }>
> {
  return cacheAside(
    CACHE_KEYS.BRANDS,
    async () => {
      const snapshot = await firestoreAdmin
        .collection('products')
        .where('status', '==', 'active')
        .select('brand')
        .get();

      const brandCounts = new Map<string, number>();

      snapshot.docs.forEach((doc) => {
        const brand = (doc.data() as any).brand || 'Unknown Brand';
        brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
      });

      return Array.from(brandCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
    CACHE_TTL.BRANDS
  ) as Promise<Array<{ name: string; count: number }>>;
}

/**
 * Invalidate product cache when updates occur
 * Should be called after product create/update/delete
 */
export async function invalidateProductCache(): Promise<void> {
  await cacheClearPattern('catalog:products:*');
}

/**
 * Invalidate category cache
 */
export async function invalidateCategoryCache(): Promise<void> {
  await cacheClearPattern(`${CACHE_KEYS.CATEGORIES}*`);
  await invalidateProductCache();
}

/**
 * Invalidate brand cache
 */
export async function invalidateBrandCache(): Promise<void> {
  await cacheClearPattern(`${CACHE_KEYS.BRANDS}*`);
  await invalidateProductCache();
}
