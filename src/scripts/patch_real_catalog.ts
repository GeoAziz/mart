import { firestoreAdmin } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

async function patchCatalog() {
  console.log('Fetching products to resolve missing vendors...');
  const productsSnap = await firestoreAdmin.collection('products').get();
  
  if (productsSnap.empty) {
    console.error('No products found. Did the import fail?');
    process.exit(1);
  }

  const vendorsMap = new Map<string, string>(); // vendorId -> brand/name
  const products = [];

  for (const doc of productsSnap.docs) {
    const data = doc.data();
    products.push({ id: doc.id, ...data });
    
    if (data.vendorId && !vendorsMap.has(data.vendorId)) {
      // Use the brand name as the store name if available, otherwise generic
      vendorsMap.set(data.vendorId, data.brand || `Store ${data.vendorId.split('_').pop()}`);
    }
  }

  console.log(`Found ${vendorsMap.size} unique vendors to generate.`);

  // 1. Generate Missing Vendors
  const batch = firestoreAdmin.batch();
  let count = 0;
  
  for (const [vendorId, storeName] of vendorsMap.entries()) {
    const vendorRef = firestoreAdmin.collection('vendors').doc(vendorId);
    batch.set(vendorRef, {
      storeName: storeName,
      description: `Welcome to the official ${storeName} store! We offer high-quality products directly to you.`,
      logoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(storeName)}`,
      coverImageUrl: 'https://placehold.co/1200x400/png?text=Store+Cover',
      status: 'active',
      rating: 4.8,
      createdAt: Timestamp.now(),
      imported: true
    }, { merge: true });
    
    count++;
    if (count % 400 === 0) {
      await batch.commit(); // commit in chunks if there are many
    }
  }
  await batch.commit();
  console.log('✅ Vendor profiles successfully generated!');

  // 2. Generate CMS Homepage Content
  console.log('Generating CMS Homepage configuration...');
  
  // Pick top 4 products for featured section
  const topProducts = products
    .filter(p => p.imageUrl && p.name)
    .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 4);

  const featuredItems = topProducts.map(p => ({
    id: `featured-product-${p.id}`,
    type: 'product',
    itemId: p.id,
    displayName: p.name,
    imageUrl: p.imageUrl || 'https://placehold.co/300x300',
    dataAiHint: p.category || 'featured product'
  }));

  const homepageData = {
    heroSlides: [
      {
        id: 'slide-1',
        title: 'Welcome to ZilaCart',
        description: 'Discover the best products from top local and international vendors.',
        imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop',
        link: '/categories',
        buttonText: 'Shop Now',
        dataAiHint: 'ecommerce shopping'
      },
      {
        id: 'slide-2',
        title: 'New Arrivals',
        description: 'Check out our latest selection of electronics, fashion, and beauty.',
        imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=2070&auto=format&fit=crop',
        link: '/categories/electronics',
        buttonText: 'View Electronics',
        dataAiHint: 'electronics'
      }
    ],
    featuredItems: featuredItems,
    promoBanners: [
      {
        id: 'promo-1',
        title: 'Free Shipping',
        subtitle: 'On orders over $50',
        imageUrl: 'https://placehold.co/600x300?text=Free+Shipping',
        link: '/categories'
      }
    ],
    updatedAt: Timestamp.now(),
  };

  await firestoreAdmin.collection('cms').doc('homepage_content').set(homepageData);
  console.log('✅ CMS Homepage successfully seeded!');
  process.exit(0);
}

patchCatalog().catch(console.error);

