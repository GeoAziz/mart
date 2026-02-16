/**
 * Image Relevance Scoring Engine
 * 
 * Intelligently scores Unsplash results to select the best product-focused image
 * based on:
 * - Keyword matches in title/description
 * - Tag relevance
 * - Product photography indicators
 * - Penalization for irrelevant content (people, nature, etc.)
 */

export interface UnsplashImage {
  id: string;
  urls: {
    small: string;
    regular: string;
    full: string;
  };
  description?: string;
  alt_description?: string;
  tags?: Array<{ title: string }>;
  likes: number;
  downloads: number;
  user?: {
    name: string;
  };
}

export interface ScoringResult {
  imageId: string;
  imageUrl: string;
  score: number;
  breakdown: {
    keywordMatch: number;
    tagsMatch: number;
    productPhotography: number;
    popularity: number;
    penalizations: number;
  };
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Score a single image based on multi-factor relevance
 * 
 * Returns detailed scoring breakdown for transparency & debugging
 */
export function scoreImage(
  image: UnsplashImage,
  productTitle: string,
  category: string
): ScoringResult {
  let score = 0;
  const breakdown = {
    keywordMatch: 0,
    tagsMatch: 0,
    productPhotography: 0,
    popularity: 0,
    penalizations: 0
  };

  const title = productTitle.toLowerCase();
  const desc = (image.description || image.alt_description || '').toLowerCase();
  const tags = image.tags?.map(t => t.title.toLowerCase()) || [];

  // ========================
  // 1. KEYWORD MATCHING (max +8)
  // ========================
  
  // Exact product title match in description
  if (desc.includes(title)) {
    breakdown.keywordMatch += 5;
  }
  
  // Partial matches (first 3 words of product)
  const titleWords = title.split(' ').slice(0, 3);
  titleWords.forEach(word => {
    if (word.length > 3 && desc.includes(word)) {
      breakdown.keywordMatch += 1;
    }
  });
  
  // Cap keyword match
  breakdown.keywordMatch = Math.min(breakdown.keywordMatch, 8);
  score += breakdown.keywordMatch;

  // ========================
  // 2. TAGS MATCHING (max +7)
  // ========================
  
  // Category-specific tag boosts
  const categoryBoosts: Record<string, string[]> = {
    'Electronics': ['computer', 'technology', 'gadget', 'tech', 'phone', 'laptop', 'keyboard', 'monitor'],
    'Fashion': ['fashion', 'clothing', 'apparel', 'shoes', 'dress', 'style'],
    'Groceries': ['food', 'grocery', 'ingredients', 'beverage', 'drink'],
    'Home & Kitchen': ['kitchen', 'furniture', 'home', 'appliance', 'cookware'],
    'Health & Beauty': ['skincare', 'cosmetics', 'beauty', 'wellness', 'health'],
    'Baby & Kids': ['baby', 'kids', 'toy', 'children'],
    'Automotive': ['car', 'auto', 'vehicle', 'motor', 'engine'],
    'Sports & Outdoors': ['sports', 'fitness', 'outdoor', 'gear'],
    'Books & Stationery': ['book', 'stationery', 'office', 'writing'],
    'Tools & Industrial': ['tool', 'industrial', 'equipment', 'hardware']
  };

  const boosts = categoryBoosts[category] || [];
  boosts.forEach(boost => {
    if (tags.includes(boost)) {
      breakdown.tagsMatch += 2;
    }
    if (desc.includes(boost)) {
      breakdown.tagsMatch += 1;
    }
  });

  // Cap tags match
  breakdown.tagsMatch = Math.min(breakdown.tagsMatch, 7);
  score += breakdown.tagsMatch;

  // ========================
  // 3. PRODUCT PHOTOGRAPHY INDICATORS (max +6)
  // ========================
  
  const productPhotographyIndicators = [
    'isolated',
    'white background',
    'studio',
    'product',
    'packshot',
    'clean background',
    'minimalist'
  ];

  productPhotographyIndicators.forEach(indicator => {
    if (desc.includes(indicator)) {
      breakdown.productPhotography += 1.5;
    }
    if (tags.includes(indicator)) {
      breakdown.productPhotography += 1;
    }
  });

  // Cap product photography score
  breakdown.productPhotography = Math.min(breakdown.productPhotography, 6);
  score += breakdown.productPhotography;

  // ========================
  // 4. POPULARITY BOOST (max +3)
  // ========================
  
  // High-quality images tend to have more likes
  if (image.likes > 1000) {
    breakdown.popularity = 3;
  } else if (image.likes > 500) {
    breakdown.popularity = 2;
  } else if (image.likes > 100) {
    breakdown.popularity = 1;
  }
  score += breakdown.popularity;

  // ========================
  // 5. PENALIZATIONS (subtract)
  // ========================
  
  const negativeIndicators = [
    'people',
    'human',
    'person',
    'face',
    'lifestyle',
    'nature',
    'outdoor',
    'landscape',
    'tree',
    'coffee',
    'workspace',
    'office',
    'model',
    'crowd'
  ];

  negativeIndicators.forEach(negative => {
    if (desc.includes(negative)) {
      breakdown.penalizations -= 4;
    }
    if (tags.includes(negative)) {
      breakdown.penalizations -= 3;
    }
  });

  score += breakdown.penalizations; // Subtract penalties

  // ========================
  // CALCULATE CONFIDENCE LEVEL
  // ========================
  
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  if (score >= 8) {
    confidence = 'high';
  } else if (score >= 4) {
    confidence = 'medium';
  }

  return {
    imageId: image.id,
    imageUrl: image.urls.regular || image.urls.small,
    score,
    breakdown,
    confidence
  };
}

/**
 * Rank multiple images and return best match
 */
export function selectBestImage(
  images: UnsplashImage[],
  productTitle: string,
  category: string,
  minConfidenceScore: number = 4 // Minimum score threshold
): ScoringResult | null {
  if (images.length === 0) {
    return null;
  }

  const scores = images.map(img => 
    scoreImage(img, productTitle, category)
  );

  // Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score);

  // Return best match above threshold
  const bestMatch = scores[0];
  if (bestMatch && bestMatch.score >= minConfidenceScore) {
    return bestMatch;
  }

  return null;
}

/**
 * Log scoring details for debugging
 */
export function logScoringDetails(result: ScoringResult, productTitle: string): void {
  console.log(`\n📊 Image Scoring for "${productTitle}"`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Score: ${result.score.toFixed(1)} | Confidence: ${result.confidence.toUpperCase()}`);
  console.log(`\nBreakdown:`);
  console.log(`  ✓ Keyword Match:        ${result.breakdown.keywordMatch.toFixed(1)}`);
  console.log(`  ✓ Tags Match:           ${result.breakdown.tagsMatch.toFixed(1)}`);
  console.log(`  ✓ Product Photography:  ${result.breakdown.productPhotography.toFixed(1)}`);
  console.log(`  ✓ Popularity Boost:     ${result.breakdown.popularity.toFixed(1)}`);
  console.log(`  ✗ Penalizations:        ${result.breakdown.penalizations.toFixed(1)}`);
  console.log(`\nSelected: ${result.imageUrl}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}
