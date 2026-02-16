# Intelligent Product Image Selection System

## Overview

The ZilaCart platform now uses an intelligent image selection engine that replaces the simple Unsplash redirect approach. This system ensures product images are relevant, professional, and properly categorized.

## ✨ What Changed

### Before ❌
- Single API call to Unsplash `/featured/` endpoint
- First result used regardless of relevance
- Returned irrelevant images (nature photos for laptops, lifestyle shots for products)
- No scoring or validation
- No caching mechanism

### After ✅
- Multi-stage intelligent selection
- Fetches 8 candidates from Unsplash API
- Relevance scoring algorithm (0-21 scale)
- Confidence-based thresholds
- Category-aware fallback placeholders
- Debug logging for transparency

## 🏗 Architecture

The system is organized in `/lib/image/` with four modular components:

### 1. **Query Enhancement** (`enhanceQuery.ts`)
Transforms product names into product-photography-focused queries.

```typescript
// Input: "RTX 4090 Graphics Card", "Electronics"
// Output: "RTX 4090 Graphics Card product shot isolated white background studio lighting product photography -people"
```

**Why:** Unsplash works better with specific product photography keywords.

### 2. **Fetch Multiple Results** (`fetchUnsplash.ts`)
Calls Unsplash API with:
- 8 results per query (not just 1)
- Content filter set to `high` (no explicit content)
- Proper rate-limit handling
- Timeout protection (5 seconds)

```typescript
const images = await fetchUnsplashImages(productName, category);
// Returns up to 8 UnsplashImage objects
```

**Rate Limits:**
- Unauthenticated: 50 requests/hour
- Authenticated: 5000 requests/hour

### 3. **Relevance Scoring** (`scoreImage.ts`)
Scores each image on a 0-21 scale:

| Factor | Points | How It Works |
|--------|--------|--------------|
| **Keyword Match** | 0-8 | Product title in description/tags |
| **Tags Match** | 0-7 | Category-specific tags present |
| **Product Photography** | 0-6 | "Isolated", "white background", "studio" |
| **Popularity** | 0-3 | Likes indicate quality |
| **Penalizations** | -15+ | Deduct for "people", "nature", "lifestyle" |

**Example Scoring:**
```
RTX 4090 Photo:
  ✓ Keyword Match: 5 (title found)
  ✓ Tags: 4 (computer, gpu tags)
  ✓ Product Photo: 6 (studio shot)
  ✓ Popularity: 2 (500+ likes)
  ✗ Penalizations: 0
  ━━━━━━━━━━━━━━━
  TOTAL: 17/21 → HIGH confidence ✅
```

### 4. **Selection & Fallback** (`selectBestImage.ts`)
Orchestrates the complete flow:

```
1. Enhance query
   ↓
2. Fetch 8 images from Unsplash
   ↓
3. Score all images
   ↓
4. Check if best score ≥ 4 (min threshold)
   ↓
5. YES → Return Unsplash image
   NO → Return category-specific placeholder
```

## 🔑 Configuration

### Unsplash API Setup

To enable quality image selection, get a free Unsplash API key:

1. **Sign up:** https://unsplash.com/api
2. **Register app** (takes 2 minutes)
3. **Copy Access Key**
4. **Add to `.env`:**

```env
# .env or .env.local
UNSPLASH_ACCESS_KEY=your_access_key_here
```

**Optional** for debugging:
```env
# Show detailed scoring info during seeding
DEBUG_IMAGES=true
```

### Without API Key
If API key is not configured:
- System still works (graceful degradation)
- Uses category-specific placeholder images
- Prints warning during seeding

## 📦 Placeholder Images

Placeholders exist in `/public/images/placeholders/`:

```
electronics-placeholder.png          # Default: blue circuit board
fashion-placeholder.png              # Clothing hanger
groceries-placeholder.png            # Shopping cart
home-kitchen-placeholder.png         # Kitchen utensils
health-beauty-placeholder.png        # Wellness items
baby-kids-placeholder.png            # Toys
automotive-placeholder.png           # Car parts
sports-outdoors-placeholder.png      # Equipment
books-stationery-placeholder.png     # Books
tools-industrial-placeholder.png     # Tools
product-placeholder.png              # Generic fallback
```

## 🚀 Usage

### Seeding Database

Run the standard seed command (now with intelligent images):

```bash
npm run db:seed
```

**Output shows:**
- Enhanced queries for transparency
- Number of Unsplash candidates fetched
- Selected image source (Unsplash vs. placeholder)
- Confidence level for each product

### Manual Image Selection

Get image for a single product:

```typescript
import { getProductImage } from '@/lib/image';

// In async context
const result = await getProductImage('MacBook Pro 16"', 'Electronics');

console.log(result);
// {
//   url: "https://images.unsplash.com/...",
//   source: "unsplash",
//   confidence: "high",
//   score: 18.5,
//   isPlaceholder: false
// }
```

### Batch Processing

For seeding or bulk operations:

```typescript
import { getBatchProductImages } from '@/lib/image';

const products = [
  { name: 'iPhone 14', category: 'Electronics' },
  { name: 'Blue Jeans', category: 'Fashion' },
  { name: 'Milk 1L', category: 'Groceries' }
];

const results = await getBatchProductImages(products);
// Returns array of ProductImageResult for each product
```

### Debug Mode

Enable detailed logging:

```typescript
const result = await getProductImage(
  'RTX 4090 Graphics Card',
  'Electronics',
  true // Enable debug logging
);
```

**Debug Output:**
```
🔍 Getting image for: "RTX 4090 Graphics Card" (Electronics)
📝 Enhanced query: "RTX 4090 Graphics Card product shot isolated white background..."
📡 Fetched 8 candidates from Unsplash
📊 Image Scoring for "RTX 4090 Graphics Card"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score: 17.0 | Confidence: HIGH
Breakdown:
  ✓ Keyword Match:        5.0
  ✓ Tags Match:           4.0
  ✓ Product Photography:  6.0
  ✓ Popularity Boost:     2.0
  ✗ Penalizations:        0.0
Selected: https://images.unsplash.com/...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 📊 Monitoring

Check API rate limits:

```typescript
import { getRateLimitInfo, formatRateLimitInfo } from '@/lib/image';

const limits = getRateLimitInfo();
console.log(`Rate limit: ${formatRateLimitInfo()}`);
// Output: Rate limit: 47/50 (94%) remaining
```

## 🔄 Caching Layer (Future Enhancement)

To prevent re-fetching images and improve performance:

1. **Add DB column:**
   ```sql
   products.validatedImageUrl -- Stores selected image URL
   products.imageConfidence   -- Stores confidence level
   products.imageCacheExpiry  -- TTL for re-validation
   ```

2. **On product creation:**
   ```typescript
   const imageResult = await getProductImage(name, category);
   
   // Save result to prevent re-fetch
   await updateProduct(productId, {
     validatedImageUrl: imageResult.url,
     imageConfidence: imageResult.confidence,
     imageCacheExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
   });
   ```

3. **On product display:**
   ```typescript
   // Use cached image if still valid
   if (product.imageCacheExpiry > new Date()) {
     return product.validatedImageUrl;
   }
   // Re-validate if expired
   ```

## 🎯 Confidence Thresholds

The system uses a **minimum score of 4/21** to accept an Unsplash result:

| Score | Confidence | Action |
|-------|-----------|--------|
| ≥ 8 | HIGH | ✅ Use immediately |
| 4-7 | MEDIUM | ✅ Use with validation |
| < 4 | LOW | ❌ Use placeholder |

## 🚨 Troubleshooting

### 1. "Getting only placeholder images"
- **Cause:** Unsplash API key not configured
- **Fix:** Add `UNSPLASH_ACCESS_KEY` to `.env`
- **Check:** Seed output will show `[FALLBACK]` next to products

### 2. "Rate limit errors"
- **Cause:** Exceeded 50 requests/hour (unauthenticated)
- **Solution:** 
  - Add API key for 5000 requests/hour
  - Or wait 1 hour and retry
  - Monitor with `getRateLimitInfo()`

### 3. "Unrelated images still appearing"
- **Debug:** Enable debug mode and check scoring breakdown
- **Check:** Run single product test: `await getProductImage('iPhone', 'Electronics', true)`
- **Inspect:** Review scoring weights in `scoreImage.ts`

### 4. "API requests timing out"
- **Issue:** Network latency > 5 seconds
- **Solution:** 
  - Check internet connection
  - System automatically retries (1 attempt)
  - Can increase timeout in `fetchUnsplash.ts` if needed

## 📚 File Locations

```
/lib/image/
├── index.ts                 # Main exports
├── enhanceQuery.ts          # Query enhancement
├── fetchUnsplash.ts         # API fetching
├── scoreImage.ts            # Relevance scoring
└── selectBestImage.ts       # Selection orchestration

/scripts/
└── seed.ts                  # Uses new system

/public/images/placeholders/
└── *-placeholder.png        # 11 category placeholders
```

## 🔮 Advanced: Custom Scoring

To adjust scoring weights, edit `scoreImage.ts`:

```typescript
// Example: Boost product photography scoring
if (desc.includes("studio")) {
  breakdown.productPhotography += 2; // was 1.5
}

// Example: Add penalty for specific keywords
if (tags.includes("abstract")) {
  breakdown.penalizations -= 5; // was -3
}
```

## ✅ Summary

This system provides:
- ✨ **Smart Selection:** Multi-factor scoring algorithm
- 🎯 **Relevant Images:** Fetches 8 candidates, picks best
- 🛡️ **Confidence Thresholds:** No low-quality images
- 🎨 **Professional Fallbacks:** Category-specific placeholders
- 🚀 **Scalable:** Batch processing, rate limit awareness
- 🔍 **Transparent:** Debug logging & scoring breakdown
- 💾 **Future-Proof:** Ready for caching layer

Your products will now display relevant, professional images instead of random nature photos! 🎉
