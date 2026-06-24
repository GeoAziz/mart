/**
 * Algolia Search Service
 * Provides full-text search capabilities for products
 */

import algoliasearch from 'algoliasearch';
import type { Product } from '@/lib/types';

let searchClient: ReturnType<typeof algoliasearch> | null = null;

/**
 * Initialize Algolia search client
 */
export function initializeAlgolia() {
  if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_SEARCH_API_KEY) {
    console.warn('[Search] Algolia credentials not configured, search features disabled');
    return null;
  }

  searchClient = algoliasearch(
    process.env.ALGOLIA_APP_ID,
    process.env.ALGOLIA_SEARCH_API_KEY
  );

  return searchClient;
}

/**
 * Check if Algolia is configured
 */
export function isAlgoliaEnabled(): boolean {
  return !!searchClient || !!(process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_SEARCH_API_KEY);
}

/**
 * Get Algolia client (initialize if needed)
 */
function getSearchClient() {
  if (!searchClient && isAlgoliaEnabled()) {
    initializeAlgolia();
  }
  return searchClient;
}

/**
 * Transform product for indexing
 */
function transformProductForIndex(product: Partial<Product> & { id: string }) {
  return {
    objectID: product.id,
    name: product.name || '',
    description: product.description || '',
    price: product.price || 0,
    category: product.category || '',
    brand: product.brand || '',
    rating: product.rating || 0,
    stock: product.stock || 0,
    imageUrl: product.imageUrl || '',
    status: product.status || '',
    vendorId: product.vendorId || '',
  };
}

/**
 * Index a single product
 */
export async function indexProduct(product: Partial<Product> & { id: string }): Promise<void> {
  const client = getSearchClient();
  if (!client) return;

  try {
    const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME || 'products');
    const transformed = transformProductForIndex(product);
    await index.saveObject(transformed);
  } catch (error) {
    console.error('[Search] Error indexing product:', error);
  }
}

/**
 * Index multiple products (batch operation)
 */
export async function indexProducts(
  products: Array<Partial<Product> & { id: string }>
): Promise<void> {
  const client = getSearchClient();
  if (!client) return;

  try {
    const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME || 'products');
    const transformed = products.map(transformProductForIndex);
    await index.saveObjects(transformed, { autoGenerateObjectIDIfNotExist: false });
  } catch (error) {
    console.error('[Search] Error batch indexing products:', error);
  }
}

/**
 * Delete product from index
 */
export async function deleteProductFromIndex(productId: string): Promise<void> {
  const client = getSearchClient();
  if (!client) return;

  try {
    const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME || 'products');
    await index.deleteObject(productId);
  } catch (error) {
    console.error('[Search] Error deleting product from index:', error);
  }
}

/**
 * Search products
 */
export async function searchProducts(
  query: string,
  options: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'relevance' | 'price-asc' | 'price-desc' | 'rating' | 'newest';
  } = {}
): Promise<
  Array<Partial<Product> & { id: string }> | null
> {
  const client = getSearchClient();
  if (!client) return null;

  try {
    const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME || 'products');

    // Build filters
    const filters: string[] = ['status:active'];

    if (options.category) {
      filters.push(`category:"${options.category}"`);
    }
    if (options.brand) {
      filters.push(`brand:"${options.brand}"`);
    }
    if (options.minPrice !== undefined) {
      filters.push(`price >= ${options.minPrice}`);
    }
    if (options.maxPrice !== undefined) {
      filters.push(`price <= ${options.maxPrice}`);
    }

    // Map sort option to Algolia
    let sortBy = '';
    switch (options.sortBy) {
      case 'price-asc':
        sortBy = 'price:asc';
        break;
      case 'price-desc':
        sortBy = 'price:desc';
        break;
      case 'rating':
        sortBy = 'rating:desc';
        break;
      case 'newest':
        sortBy = 'dateAdded:desc';
        break;
      default:
        sortBy = '';
    }

    const result = await index.search(query, {
      filters: filters.join(' AND '),
      hitsPerPage: options.limit || 20,
      page: (options.offset || 0) / (options.limit || 20),
      ...(sortBy && { sortBy }),
    });

    return (result.hits as Array<Partial<Product> & { id: string }>) || [];
  } catch (error) {
    console.error('[Search] Error searching products:', error);
    return null;
  }
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 10
): Promise<string[] | null> {
  const client = getSearchClient();
  if (!client) return null;

  try {
    const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME || 'products');

    const result = await index.search(query, {
      filters: 'status:active',
      hitsPerPage: limit,
      attributesToSnippet: ['name', 'category'],
    });

    // Extract unique product names and categories as suggestions
    const suggestions = new Set<string>();

    (result.hits as any[]).forEach((hit) => {
      if (hit.name) suggestions.add(hit.name);
      if (hit.category) suggestions.add(hit.category);
    });

    return Array.from(suggestions).slice(0, limit);
  } catch (error) {
    console.error('[Search] Error getting suggestions:', error);
    return null;
  }
}

/**
 * Clear all products from index
 */
export async function clearProductIndex(): Promise<void> {
  const client = getSearchClient();
  if (!client) return;

  try {
    const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME || 'products');
    await index.clearObjects();
  } catch (error) {
    console.error('[Search] Error clearing index:', error);
  }
}
