
/**
 * ZilaCart Database Seeder
 * --------------------------
 * This script populates the Firestore database with realistic sample data for
 * ZilaCart, tailored to the Kenyan market based on provided research.
 *
 * It will:
 * 1. CLEAR existing data in users, products, categories, cms, and orders collections.
 * 2. Create sample users (admin, vendors, customers).
 * 3. Create product categories.
 * 4. Create over 100 product listings assigned to vendors.
 * 5. Create sample orders to populate dashboards and order histories.
 * 6. Create ledger entries for delivered orders to populate vendor earnings.
 * 7. Create CMS content for the homepage (hero slides, featured items).
 *
 * HOW TO RUN:
 * 1. Ensure your .env file is correctly configured with Firebase CLIENT-SIDE and GOOGLE_API_KEY credentials.
 * 2. Run the command: `npm run db:seed`
 */

import 'dotenv/config';
import { firestoreAdmin, firebaseAdminAuth } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { faker } from '@faker-js/faker';
import type { UserProfile, Role, Product, Category, Order, OrderItem, LedgerEntry } from '@/lib/types';
import { toFirestoreTimestamp, ensureTimestampField } from '@/lib/timestamp-utils';


// --- HELPER FUNCTIONS ---
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomPrice = (min: number, max: number): number => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const generateRandomDate = (start: Date, end: Date): Date => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

/**
 * Generate contextual product images using Picsum Photos
 * Stable, reliable, and provides consistent images per product
 */
function generateProductImage(productName: string, category: string, index: number): string {
  const categoryImageMap: Record<string, string[]> = {
    'Electronics': ['smartphone', 'laptop', 'headphones', 'tablet', 'camera'],
    'Fashion': ['clothing', 'shoes', 'fashion', 'sneakers', 'dress'],
    'Groceries': ['food', 'grocery', 'fresh-produce', 'beverage'],
    'Home & Kitchen': ['kitchen', 'furniture', 'home-decor', 'cookware'],
    'Health & Beauty': ['cosmetics', 'skincare', 'wellness', 'beauty'],
    'Baby & Kids': ['toys', 'baby-products', 'children', 'kids'],
    'Automotive': ['car', 'automotive', 'vehicle', 'tools'],
    'Sports & Outdoors': ['sports', 'fitness', 'outdoor', 'exercise'],
    'Books & Stationery': ['books', 'stationery', 'reading', 'office'],
    'Tools & Industrial': ['tools', 'workshop', 'industrial', 'equipment']
  };

  const keywords = categoryImageMap[category] || ['product'];
  const keyword = keywords[index % keywords.length];
  
  // Use Picsum Photos - stable, reliable, consistent
  // Seed based on product name ensures same image for same product
  const seed = productName.replace(/\s+/g, '').substring(0, 10) + index;
  return `https://picsum.photos/seed/${seed}/400/300?random=${index}`;
}

// --- DATA DEFINITIONS (Based on user research) ---

const categoriesData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { name: "Electronics", description: "Latest phones, TVs, laptops, and audio devices." },
    { name: "Fashion", description: "Trendy apparel, shoes, and accessories for men, women, and kids." },
    { name: "Groceries", description: "Your daily needs including dry foods, drinks, and cleaning items." },
    { name: "Home & Kitchen", description: "Cookware, appliances, furniture, and decor to beautify your home." },
    { name: "Health & Beauty", description: "Skincare, hair care, wellness products, and personal hygiene essentials." },
    { name: "Baby & Kids", description: "Everything for your little ones, from diapers and clothing to toys." },
    { name: "Automotive", description: "Motor oils, tools, and accessories to keep your vehicle running smoothly." },
    { name: "Sports & Outdoors", description: "Gear up for your favorite sports and outdoor adventures." },
    { name: "Books & Stationery", description: "A wide range of textbooks, novels, and school or office supplies." },
    { name: "Tools & Industrial", description: "Power tools, hand tools, and safety equipment for every job." },
];

// --- ADMIN UI TEST DATA ENHANCEMENTS ---

// Suspended user
const suspendedUser = {
  fullName: "Blocked User",
  email: "blocked@example.com",
  password: "Test1234!",
  role: "customer",
  status: "suspended"
};

// Example low/out of stock and discounted products
const specialProducts = [
  { name: "Budget Earphones", category: "Electronics", price: 499, stock: 2, status: "active", discount: 10 },
  { name: "Rare Book", category: "Books & Stationery", price: 1200, stock: 0, status: "active" },
  { name: "Promo T-Shirt", category: "Fashion", price: 999, stock: 10, status: "active", discount: 20 },
];

// Example reviews
const reviews = [
  { productId: "1", userId: "customer1", rating: 5, comment: "Excellent!", createdAt: new Date() },
  { productId: "2", userId: "customer2", rating: 3, comment: "Average quality.", createdAt: new Date() },
  { productId: "1", userId: "customer3", rating: 4, comment: "Good value.", createdAt: new Date() },
];

// Example payouts
const payouts = [
  { vendorId: "vendor1", amount: 5000, status: "pending", createdAt: new Date() },
  { vendorId: "vendor2", amount: 12000, status: "completed", createdAt: new Date() },
  { vendorId: "vendor1", amount: 3000, status: "failed", createdAt: new Date() },
];

// Example refunds
const refunds = [
  { orderId: "order1", userId: "customer1", amount: 2500, status: "pending", createdAt: new Date() },
  { orderId: "order2", userId: "customer2", amount: 1200, status: "approved", createdAt: new Date() },
  { orderId: "order3", userId: "customer3", amount: 800, status: "denied", createdAt: new Date() },
];

// Example promotions
const promotions = [
  { code: "WELCOME10", description: "10% off for new users", type: "percentage", value: 10, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 7*24*60*60*1000), usageLimit: 100, minPurchaseAmount: 1000 },
  { code: "FIXED500", description: "KSh 500 off orders above 5k", type: "fixed_amount", value: 500, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 14*24*60*60*1000), usageLimit: 50, minPurchaseAmount: 5000 },
  { code: "FEATURED20", description: "20% off featured offer", type: "percentage", value: 20, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 3*24*60*60*1000), usageLimit: 20, minPurchaseAmount: 2000 },
];

// Example newsletter signups
const newsletterSignups = [
  { email: "test1@email.com", createdAt: new Date() },
  { email: "test2@email.com", createdAt: new Date() },
  { email: "test3@email.com", createdAt: new Date() },
];

// Example promo banner for CMS
const promoBanners = [
  { id: "banner1", name: "Mega Sale", imageUrl: "https://placehold.co/1200x200/FF5733/E0E0E0?text=Mega+Sale", link: "/products", isActive: true, displayArea: "homepage_top" },
];

// ...existing code...

const productsData = [
  // Electronics
  { category: "Electronics", name: "Infinix Smart 7 HD", priceRange: [10300, 11150], brand: "Infinix" },
  { category: "Electronics", name: "Xiaomi Redmi 10A", priceRange: [16400, 16500], brand: "Xiaomi" },
  { category: "Electronics", name: "Tecno Spark 10C", priceRange: [14800, 14900], brand: "Tecno" },
  { category: "Electronics", name: "Nokia G21", priceRange: [18900, 19000], brand: "Nokia" },
  { category: "Electronics", name: "Redmi Note 12", priceRange: [21499, 30200], brand: "Xiaomi" },
  { category: "Electronics", name: "iTel S18", priceRange: [11600, 11700], brand: "iTel" },
  { category: "Electronics", name: "Samsung Galaxy A04s", priceRange: [19100, 19200], brand: "Samsung" },
  { category: "Electronics", name: "iPhone 14", priceRange: [125000, 130000], brand: "Apple" },
  { category: "Electronics", name: "Samsung Galaxy S24 Plus", priceRange: [115000, 135000], brand: "Samsung" },
  { category: "Electronics", name: "Lenovo IdeaPad 1", priceRange: [29999, 32000], brand: "Lenovo" },
  { category: "Electronics", name: "HP 14-inch Celeron", priceRange: [35000, 36000], brand: "HP" },
  { category: "Electronics", name: "Acer Chromebook 11", priceRange: [33500, 34000], brand: "Acer" },
  { category: "Electronics", name: "HP 250 G6 (i3)", priceRange: [37500, 38000], brand: "HP" },
  { category: "Electronics", name: "Dell Inspiron 5570 (i7)", priceRange: [78899, 80000], brand: "Dell" },
  { category: "Electronics", name: "Apple MacBook Air M1", priceRange: [139999, 145000], brand: "Apple" },
  // Fashion
  { category: "Fashion", name: "Men's Casual PU Loafers - Brown", priceRange: [499, 699], brand: "Generic" },
  { category: "Fashion", name: "Formal Leather Men's Shoes - Black", priceRange: [1250, 1400], brand: "Fashion" },
  { category: "Fashion", name: "Women's Flat Sandals - Summer Style", priceRange: [790, 1350], brand: "Generic" },
  { category: "Fashion", name: "Heeled Sandals for Women", priceRange: [999, 2000], brand: "Fashion" },
  { category: "Fashion", name: "Handmade Masai Bead Sandals", priceRange: [699, 850], brand: "Artisanal" },
  { category: "Fashion", name: "Comfortable Wedge Sandals", priceRange: [1999, 2500], brand: "Fashion" },
  { category: "Fashion", name: "Unisex Flip-flop Sliders", priceRange: [599, 699], brand: "Generic" },
  { category: "Fashion", name: "Men's Gladiator Leather Sandals", priceRange: [1050, 1250], brand: "Artisanal" },
  { category: "Fashion", name: "Women's Leather Masai Sandals", priceRange: [1350, 1500], brand: "Artisanal" },
  { category: "Fashion", name: "Bata Sandak Hazel", priceRange: [349, 400], brand: "Bata" },
  // Groceries
  { category: "Groceries", name: "Unga wa Dola (2kg)", priceRange: [200, 300], brand: "Dola" },
  { category: "Groceries", name: "Pishori Rice (5kg)", priceRange: [600, 800], brand: "Capwell" },
  { category: "Groceries", name: "KCC UHT Milk (1L)", priceRange: [150, 200], brand: "KCC" },
  { category: "Groceries", name: "Fresh Fri Cooking Oil (2L)", priceRange: [500, 700], brand: "Fresh Fri" },
  { category: "Groceries", name: "Coca-Cola (2L)", priceRange: [180, 250], brand: "Coca-Cola" },
  { category: "Groceries", name: "Kabras Sugar (2kg)", priceRange: [200, 250], brand: "Kabras" },
  { category: "Groceries", name: "Kericho Gold Tea Leaves (500g)", priceRange: [300, 400], brand: "Kericho Gold" },
  { category: "Groceries", name: "Sunlight Dishwashing Liquid (500ml)", priceRange: [100, 150], brand: "Sunlight" },
  { category: "Groceries", name: "Ariel Laundry Powder (2kg)", priceRange: [400, 600], brand: "Ariel" },
  { category: "Groceries", name: "Dasani Packaged Water (500ml x 24)", priceRange: [400, 500], brand: "Dasani" },
  // Home & Kitchen
  { category: "Home & Kitchen", name: "Royalty Line Non-stick Frying Pan", priceRange: [1200, 1500], brand: "Royalty Line" },
  { category: "Home & Kitchen", name: "Signature Pressure Cooker (5L)", priceRange: [2500, 3500], brand: "Signature" },
  { category: "Home & Kitchen", name: "Ramtons Electric Kettle (1.7L)", priceRange: [1500, 2000], brand: "Ramtons" },
  { category: "Home & Kitchen", name: "Bruhm Blender with Grinder", priceRange: [2500, 3500], brand: "Bruhm" },
  { category: "Home & Kitchen", name: "Samsung Microwave Oven (23L)", priceRange: [8000, 12000], brand: "Samsung" },
  { category: "Home & Kitchen", name: "Von Hotpoint 2-Burner Gas Cooker", priceRange: [7000, 10000], brand: "Von Hotpoint" },
  { category: "Home & Kitchen", name: "Modern Dining Table & 4 Chairs", priceRange: [15000, 25000], brand: "Generic" },
  { category: "Home & Kitchen", name: "Moko Foam Mattress (Queen)", priceRange: [10000, 18000], brand: "Moko" },
  { category: "Home & Kitchen", name: "2-Door Wooden Wardrobe", priceRange: [12000, 20000], brand: "Generic" },
  { category: "Home & Kitchen", name: "Comfortable 3-Seater Sofa", priceRange: [18000, 30000], brand: "Generic" },
];
// --- CONFIGURATION ---
const NUM_CUSTOMERS = 15;
const NUM_VENDORS = 4;
const NUM_ORDERS = 25;
const COMMISSION_RATE = 0.10; // 10% platform commission


/**
 * DELETION FUNCTIONS
 */
async function deleteAllAuthUsers(nextPageToken?: string): Promise<void> {
  if (!firebaseAdminAuth) throw new Error('Firebase Admin Auth is not initialized.');
  const listUsersResult = await firebaseAdminAuth.listUsers(1000, nextPageToken);
  const uidsToDelete = listUsersResult.users.map(userRecord => userRecord.uid);
  if (uidsToDelete.length > 0) {
    await firebaseAdminAuth.deleteUsers(uidsToDelete);
    console.log(`Deleted ${uidsToDelete.length} authentication users.`);
  }
  if (listUsersResult.pageToken) {
    await deleteAllAuthUsers(listUsersResult.pageToken);
  }
}

async function deleteCollection(collectionPath: string, batchSize: number) {
  if (!firestoreAdmin) throw new Error('Firestore Admin is not initialized.');
  const collectionRef = firestoreAdmin.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);
  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query: FirebaseFirestore.Query, resolve: (value: unknown) => void) {
  if (!firestoreAdmin) throw new Error('Firestore Admin is not initialized.');
  const snapshot = await query.get();
  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve(0);
    return;
  }
  const batch = firestoreAdmin.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

/**
 * SEEDING FUNCTIONS
 */

async function seedUsers() {
    console.log('Seeding users...');
    const users: (UserProfile & {password: string})[] = [];
    const now = toFirestoreTimestamp(new Date());

    // Admin user
    users.push({
        uid: 'admin_user_id',
        email: 'admin@zilacart.com',
        fullName: 'Admin User',
        role: 'admin',
        status: 'active',
        password: 'password123',
        createdAt: now,
    });

    // Vendor users
    for (let i = 1; i <= NUM_VENDORS; i++) {
        users.push({
            uid: `vendor_user_id_${i}`,
            email: `vendor${i}@zilacart.com`,
            fullName: faker.person.fullName(),
            role: 'vendor',
            status: 'active',
            password: 'password123',
            createdAt: now,
        });
    }

    // Customer users
    for (let i = 1; i <= NUM_CUSTOMERS; i++) {
        users.push({
            uid: `customer_user_id_${i}`,
            email: `customer${i}@zilacart.com`,
            fullName: faker.person.fullName(),
            role: 'customer',
            status: 'active',
            password: 'password123',
            createdAt: now,
        });
    }
    
    if (!firebaseAdminAuth) throw new Error('Firebase Admin Auth is not initialized.');
    if (!firestoreAdmin) throw new Error('Firestore Admin is not initialized.');
    for (const user of users) {
        try {
            await firebaseAdminAuth.createUser({
                uid: user.uid,
                email: user.email!,
                password: user.password,
                displayName: user.fullName!,
            });
            const { password, ...profileData } = user;
            await firestoreAdmin.collection('users').doc(user.uid).set(profileData);
        } catch (error: any) {
            if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
                console.log(`User ${user.email} already exists, which should not happen after deletion. Overwriting Firestore profile.`);
                const { password, ...profileData } = user;
                await firestoreAdmin.collection('users').doc(user.uid).set(profileData, { merge: true });
            } else {
                console.error(`Error creating user ${user.email}:`, error);
            }
        }
    }
    console.log(`${users.length} users processed.`);
    return users;
}

async function seedCategories() {
    console.log('Seeding categories...');
    if (!firestoreAdmin) throw new Error('Firestore Admin is not initialized.');
    const batch = firestoreAdmin.batch();
    const now = toFirestoreTimestamp(new Date());
    for (const category of categoriesData) {
        const docRef = firestoreAdmin.collection('categories').doc();
        batch.set(docRef, { ...category, createdAt: now, updatedAt: now });
    }
    await batch.commit();
    console.log(`${categoriesData.length} categories seeded.`);
    const snapshot = await firestoreAdmin.collection('categories').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
}

async function seedProducts(vendors: UserProfile[], categories: Category[]) {
    console.log('Seeding products...');
    
    // Validate that we have vendors
    if (vendors.length === 0) {
        throw new Error('Cannot seed products: no vendors available');
    }
    
    const allProducts = [];
    const now = toFirestoreTimestamp(new Date());
    let productIndex = 0;
    
    for (const p of productsData) {
        const categoryDoc = categories.find(c => c.name === p.category);
        if (!categoryDoc) {
            console.warn(`Category ${p.category} not found for product ${p.name}. Skipping.`);
            continue;
        }

        // Validate vendor exists
        const vendor = getRandomElement(vendors);
        if (!vendor || !vendor.uid) {
            console.warn(`Invalid vendor for product ${p.name}. Skipping.`);
            continue;
        }

        const newProduct: Omit<Product, 'id'> = {
            name: p.name,
            description: faker.commerce.productDescription(),
            price: getRandomPrice(p.priceRange[0], p.priceRange[1]),
            category: p.category,
            stock: faker.number.int({ min: 0, max: 100 }),
            // Use contextual Unsplash images instead of placeholder
            imageUrl: generateProductImage(p.name, p.category, productIndex),
            dataAiHint: p.category.toLowerCase(),
            brand: p.brand,
            vendorId: vendor.uid,
            status: 'active',
            dateAdded: now,
            updatedAt: now,
            rating: faker.number.float({ min: 3.5, max: 5, precision: 0.1 }),
            sku: `${p.brand.substring(0,3).toUpperCase()}-${faker.string.alphanumeric(6).toUpperCase()}`
        };
        allProducts.push(newProduct);
        productIndex++;
    }
    
    if (!firestoreAdmin) throw new Error('Firestore Admin is not initialized.');
    const batch = firestoreAdmin.batch();
    for (const product of allProducts) {
      const docRef = firestoreAdmin.collection('products').doc();
      batch.set(docRef, product);
    }
    await batch.commit();

    console.log(`${allProducts.length} products seeded.`);
    const snapshot = await firestoreAdmin.collection('products').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
}

async function seedOrders(customers: UserProfile[], products: Product[]) {
  console.log('Seeding orders...');
  const orderStatuses: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  for (let i = 0; i < NUM_ORDERS; i++) {
    const customer = getRandomElement(customers);
    const numItems = faker.number.int({ min: 1, max: 5 });
    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = getRandomElement(products);
      const quantity = faker.number.int({ min: 1, max: 3 });
      orderItems.push({
        productId: product.id,
        name: product.name,
        quantity: quantity,
        price: product.price,
        imageUrl: product.imageUrl,
        dataAiHint: product.dataAiHint,
        vendorId: product.vendorId,
      });
      subtotal += product.price * quantity;
    }

    const shippingCost = subtotal > 5000 ? 0 : 500;
    const taxAmount = subtotal * 0.16;
    const totalAmount = subtotal + shippingCost + taxAmount;
    const orderStatus = getRandomElement(orderStatuses);
    const createdAt = generateRandomDate(new Date(2023, 0, 1), new Date());

    const order: Omit<Order, 'id'> = {
      userId: customer.uid,
      userFullName: customer.fullName,
      userEmail: customer.email,
      items: orderItems,
      shippingAddress: {
        fullName: customer.fullName!,
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        phone: faker.phone.number(),
      },
      paymentMethod: getRandomElement(['M-Pesa', 'Card']),
      status: orderStatus,
      statusHistory: [
        {
          status: orderStatus,
          timestamp: createdAt,
          note: `Order ${orderStatus}`,
        }
      ],
      subtotal,
      shippingCost,
      taxAmount,
      totalAmount,
      createdAt: toFirestoreTimestamp(createdAt),
      updatedAt: toFirestoreTimestamp(createdAt),
      vendorIds: [...new Set(orderItems.map(item => item.vendorId).filter(Boolean) as string[])],
    };

    if (!firestoreAdmin) throw new Error('Firestore Admin is not initialized.');
    
    // Use transaction to ensure order + ledger entries are atomic
    // Both succeed together or both fail together (no partial state)
    await firestoreAdmin.runTransaction(async (transaction) => {
      const orderRef = firestoreAdmin.collection('orders').doc();
      
      // 1. Create order in transaction
      transaction.set(orderRef, order);

      // 2. If order is delivered, add ledger entries in same transaction
      if (orderStatus === 'delivered') {
        for (const item of orderItems) {
          if (item.vendorId) {
            const grossSaleAmount = item.price * item.quantity;
            const commissionAmount = grossSaleAmount * COMMISSION_RATE;
            const netAmount = grossSaleAmount - commissionAmount;

            const ledgerEntry: Omit<LedgerEntry, 'id'> = {
              vendorId: item.vendorId,
              type: 'sale_credit',
              amount: grossSaleAmount,
              commissionRate: COMMISSION_RATE,
              commissionAmount: commissionAmount,
              netAmount: netAmount,
              orderId: orderRef.id,
              productId: item.productId,
              createdAt: toFirestoreTimestamp(new Date()),
              description: `Sale of ${item.quantity} x ${item.name}`,
            };

            const ledgerRef = firestoreAdmin.collection('users').doc(item.vendorId).collection('ledgerEntries').doc();
            transaction.set(ledgerRef, ledgerEntry);
          }
        }
      }
    });
  }
  console.log(`${NUM_ORDERS} orders seeded.`);
}

async function seedCmsHomepage(products: Product[], vendors: UserProfile[]) {
    console.log('Seeding CMS Homepage...');
    if (products.length < 4 || vendors.length < 2) {
        console.warn('Not enough products or vendors to seed CMS properly. Skipping.');
        return;
    }

    const featuredProducts = faker.helpers.arrayElements(products, 4);
    const featuredVendors = faker.helpers.arrayElements(vendors, 2);

    const featuredItems: any[] = [
        ...featuredProducts.map(p => ({
            id: `featured-product-${p.id}`,
            type: 'product',
            itemId: p.id,
            displayName: p.name,
            imageUrl: p.imageUrl,
            dataAiHint: p.dataAiHint,
        })),
        ...featuredVendors.map(v => ({
            id: `featured-vendor-${v.uid}`,
            type: 'vendor',
            itemId: v.uid,
            displayName: v.fullName,
            imageUrl: `https://placehold.co/100x100.png`,
            dataAiHint: 'store logo'
        }))
    ];

    const homepageData = {
        heroSlides: [ 
            { id: 'slide1-seed', title: "The Future is Now", description: "Discover tech that shapes tomorrow.", imageUrl: "https://placehold.co/1200x600.png", dataAiHint: "futuristic technology", link: "/categories/electronics", buttonText: "Explore Tech" },
            { id: 'slide2-seed', title: "Neon Fashion", description: "Light up your style with vibrant apparel.", imageUrl: "https://placehold.co/1200x600.png", dataAiHint: "neon fashion", link: "/categories/fashion", buttonText: "Shop Fashion" },
        ],
        featuredItems: featuredItems,
        promoBanners: [], // Keep empty for now
        updatedAt: new Date(),
    };

    if (!firestoreAdmin) throw new Error('Firestore Admin is not initialized.');
    const docRef = firestoreAdmin.collection('cms').doc('homepage_content');
    await docRef.set(homepageData);
    console.log('CMS Homepage seeded with featured items.');
}

/**
 * MAIN EXECUTION
 */
async function main() {
  try {
    console.log('--- Starting ZilaCart Database Seeding ---');
    console.warn('WARNING: This script will DELETE existing data in Firebase Auth and Firestore.');
    
    // Deletions
    console.log('Deleting existing data...');
    
    // 1. Delete all existing authentication users first
    console.log('Deleting all Firebase Auth users...');
    await deleteAllAuthUsers();
    console.log('All Firebase Auth users deleted.');
    
    // 2. Delete Firestore collections
    await deleteCollection('categories', 50);
    await deleteCollection('products', 50);
    await deleteCollection('orders', 50);
    await deleteCollection('users', 50); // This also deletes subcollections
    await deleteCollection('cms', 10);
    console.log('Existing Firestore collections data deleted.');

    // 3. Seeding process
    const users = await seedUsers();
    const vendors = users.filter(u => u.role === 'vendor');
    const customers = users.filter(u => u.role === 'customer');

    const categories = await seedCategories();
    const products = await seedProducts(vendors, categories);
    await seedOrders(customers, products);
    await seedCmsHomepage(products, vendors);

    console.log('--- Database seeding completed successfully! ---');
    console.log('--- You can now log in with the seeded user credentials. ---');
  } catch (error: any) {
    if (error.code === 5 /* gRPC NOT_FOUND code */) {
        console.error('\n❌ CRITICAL ERROR: Firestore database not found or not initialized.');
        console.error('It looks like a Firestore database has not been created for your project yet.');
        console.error('\n➡️  **Action Required:**');
        console.error('1. Go to the Firebase Console: https://console.firebase.google.com/');
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id';
        console.error(`2. Select your project ('${projectId}').`);
        console.error('3. In the left menu, go to "Build" > "Firestore Database".');
        console.error('4. Click "Create database".');
        console.error('5. Choose "Start in production mode" and select a server location (e.g., nam5 us-central).');
        console.error('6. After the database is created, re-run this script: `npm run db:seed`\n');
    } else {
        console.error('--- An error occurred during database seeding: ---');
        console.error(error);
    }
    process.exit(1);
  }
}

main();
