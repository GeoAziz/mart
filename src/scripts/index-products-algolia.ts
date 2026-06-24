#!/usr/bin/env npx tsx
/**
 * Index all products to Algolia
 * Run with: npx tsx src/scripts/index-products-algolia.ts
 */

import { firestoreAdmin } from '@/lib/firebase-admin';
import { indexProducts, clearProductIndex } from '@/lib/algolia-search-service';

async function indexAllProducts() {
  try {
    console.log('🔍 Starting product indexing to Algolia...\n');

    // Check if Algolia is configured
    if (!process.env.ALGOLIA_APP_ID) {
      console.error('❌ Error: ALGOLIA_APP_ID not set in environment variables');
      console.error('Please set Algolia credentials in .env.local');
      process.exit(1);
    }

    console.log('📊 Fetching active products from Firestore...');
    const snapshot = await firestoreAdmin
      .collection('products')
      .where('status', '==', 'active')
      .select('id', 'name', 'description', 'price', 'category', 'brand', 'rating', 'stock', 'imageUrl', 'vendorId')
      .get();

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✅ Found ${products.length} active products\n`);

    if (products.length === 0) {
      console.warn('⚠️  No active products found. Skipping indexing.');
      return;
    }

    // Optionally clear old index
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      console.log('🗑️  Clearing existing Algolia index...');
      await clearProductIndex();
      console.log('✅ Index cleared\n');
    }

    // Batch index products
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      console.log(`📤 Indexing products ${i + 1}-${Math.min(i + batchSize, products.length)}...`);
      await indexProducts(batch as any);
    }

    console.log(`\n✨ Successfully indexed ${products.length} products to Algolia!`);
    console.log('🎯 Your products are now searchable via /api/search');
  } catch (error) {
    console.error('❌ Error during indexing:');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  indexAllProducts();
}

export { indexAllProducts };
