/**
 * Query Enhancement Layer
 * 
 * Transforms simple product names into detailed, product-photography-focused queries
 * to bias Unsplash toward:
 * - Isolated objects
 * - Clean white/studio backgrounds
 * - Product photography style (not lifestyle)
 * - No people in frame
 */

interface EnhancedQuery {
  query: string;
  filters: {
    color?: string;
    orientation: 'portrait' | 'landscape' | 'squarish';
    contentFilter: 'low' | 'high';
  };
}

/**
 * Category-specific keywords to enhance product queries
 */
const categoryKeywords: Record<string, string[]> = {
  'Electronics': [
    'product shot', 'isolated', 'white background',
    'studio lighting', 'tech gadget', 'packshot',
    'no people', 'clean background'
  ],
  'Fashion': [
    'clothing isolated', 'apparel product', 'fashion item',
    'white background', 'front view', 'packshot lay',
    'studio lighting', 'no model'
  ],
  'Groceries': [
    'packaged food', 'product packaging', 'grocery item',
    'isolated on white', 'food product', 'studio shot'
  ],
  'Home & Kitchen': [
    'home appliance', 'kitchen product', 'furniture item',
    'product photography', 'isolated', 'studio background'
  ],
  'Health & Beauty': [
    'skincare product', 'cosmetics', 'beauty item',
    'product shot', 'packaging photography',
    'white background', 'isolated'
  ],
  'Baby & Kids': [
    'baby product', 'kids toy', 'children item',
    'product shot', 'isolated', 'studio lighting'
  ],
  'Automotive': [
    'car part', 'auto accessory', 'motor product',
    'isolated', 'product shot', 'clean background'
  ],
  'Sports & Outdoors': [
    'sports gear', 'outdoor equipment', 'athletic product',
    'product shot', 'studio lighting', 'isolated'
  ],
  'Books & Stationery': [
    'book', 'stationery', 'office supplies',
    'product photography', 'flat lay', 'white background'
  ],
  'Tools & Industrial': [
    'tool product', 'industrial equipment', 'manual tool',
    'product shot', 'isolated', 'studio lighting'
  ]
};

/**
 * Keywords to AVOID in results
 * These will influence our scoring negatively
 */
const negativeKeywords = [
  'people', 'human', 'person', 'lifestyle',
  'nature', 'outdoor', 'landscape', 'tree',
  'coffee shop', 'workspace', 'office desk',
  'office worker', 'busy', 'crowded'
];

/**
 * Enhance a product query with category-aware keywords
 * 
 * @param productName - The name of the product (e.g., "RTX 4090 Graphics Card")
 * @param category - The product category (e.g., "Electronics")
 * @returns Enhanced query object ready for Unsplash API
 */
export function enhanceProductQuery(
  productName: string,
  category: string
): EnhancedQuery {
  // Base query: start with category and product name
  const baseKeywords = [productName];
  
  // Add category-specific keywords
  const categoryBoosts = categoryKeywords[category] || [
    'product', 'isolated', 'white background', 'studio lighting'
  ];
  
  // Combine: product name + most relevant category keywords
  const enhancedKeywords = [
    productName,
    categoryBoosts[0], // Most relevant category boost
    categoryBoosts[1], // Second boost
    'isolated',
    'white background',
    'studio',
    'product photography',
    '-people' // Explicitly exclude people
  ];
  
  return {
    query: enhancedKeywords.filter(Boolean).join(' '),
    filters: {
      orientation: 'squarish', // Good for product displays
      contentFilter: 'high', // Filter out explicit content
    }
  };
}

/**
 * Extract base search term from a product name
 * Useful for simpler fallback queries
 * 
 * @param productName - Full product name
 * @returns Simplified search term
 */
export function getBaseSearchTerm(productName: string): string {
  // Remove common suffixes and modifiers
  return productName
    .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheticals
    .replace(/\s*-\s*(pack|set|bundle|combo).*$/i, '') // Remove bulk indicators
    .replace(/\s*(black|white|silver|gold|red|blue|green).*$/i, '') // Remove color suffixes
    .trim();
}

/**
 * Generate fallback negative keywords query
 * Used if primary query returns low-confidence results
 */
export function generateFallbackQuery(productName: string): string {
  return `${productName} product photography -people -nature -lifestyle`;
}
