import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { faker } from '@faker-js/faker';
import { Timestamp } from 'firebase-admin/firestore';
import type { Product, Order, Review, VendorAnalytics, InventoryLog } from '@/lib/types';

interface SeedVendorData {
  // Test vendors we created earlier
  vendorIds: string[];
  // How many months of historical data
  historyMonths: number;
  // How many products per vendor
  productsPerVendor: number;
  // How many orders to generate
  ordersPerMonth: number;
}

const seedConfig: SeedVendorData = {
  vendorIds: [
    'vendor_user_id_1', // TechHub Electronics
    'vendor_user_id_2', // Fashion Forward
    'vendor_user_id_3', // Home & Garden Plus
    'vendor_user_id_4'  // Sports & Outdoors
  ],
  historyMonths: 6,
  productsPerVendor: 25,
  ordersPerMonth: 50
};

async function seedInventoryData(vendorId: string) {
  console.log(`Seeding inventory data for vendor ${vendorId}...`);
  
  if (!firestoreAdmin) {
    throw new Error('Firestore Admin is not initialized');
  }

  // Get vendor's products
  const products = await firestoreAdmin
    .collection('products')
    .where('vendorId', '==', vendorId)
    .get();

  for (const product of products.docs) {
    // Generate stock history
    const stockLogs: InventoryLog[] = [];
    const currentDate = new Date();
    
    for (let i = 0; i < seedConfig.historyMonths; i++) {
      const date = new Date();
      date.setMonth(currentDate.getMonth() - i);
      
      stockLogs.push({
        productId: product.id,
        type: faker.helpers.arrayElement(['restock', 'adjustment', 'sale']),
        quantity: faker.number.int({ min: -10, max: 50 }),
        notes: faker.helpers.arrayElement([
          'Regular restock',
          'Stock count adjustment',
          'Bulk order fulfillment',
          'Damaged inventory removal'
        ]),
        timestamp: Timestamp.fromDate(date)
      });
    }

    // Save stock logs
    const batch = firestoreAdmin.batch();
    stockLogs.forEach(log => {
      const logRef = firestoreAdmin!
        .collection('products')
        .doc(product.id)
        .collection('stockLogs')
        .doc();
      batch.set(logRef, log);
    });

    await batch.commit();
  }
}

async function seedReviewData(vendorId: string) {
  console.log(`Seeding review data for vendor ${vendorId}...`);

  if (!firestoreAdmin) {
    throw new Error('Firestore Admin is not initialized');
  }
  
  const products = await firestoreAdmin
    .collection('products')
    .where('vendorId', '==', vendorId)
    .get();

  for (const product of products.docs) {
    const reviews: Omit<Review, 'id'>[] = [];
    const currentDate = new Date();

    // Generate reviews for each month
    for (let i = 0; i < seedConfig.historyMonths; i++) {
      const numReviews = faker.number.int({ min: 1, max: 5 });
      
      for (let j = 0; j < numReviews; j++) {
        const date = new Date();
        date.setMonth(currentDate.getMonth() - i);
        
        const hasReply = faker.datatype.boolean();
        const replyDate = new Date(date);
        replyDate.setDate(date.getDate() + faker.number.int({ min: 1, max: 5 }));

        // Base review data
        const reviewData = {
          productId: product.id,
          productName: product.data().name,
          userId: faker.string.uuid(),
          userName: faker.person.fullName(),
          userEmail: faker.internet.email(),
          rating: faker.number.int({ min: 3, max: 5 }),
          comment: faker.lorem.paragraph(),
          createdAt: Timestamp.fromDate(date),
          customerAvatar: faker.image.avatar(),
          customerInitials: faker.person.firstName().substring(0, 2).toUpperCase()
        };

        // Add optional fields only if they have values
        if (hasReply) {
          Object.assign(reviewData, {
            reply: faker.lorem.paragraph(),
            repliedAt: Timestamp.fromDate(replyDate)
          });
        }

        reviews.push(reviewData);
      }
    }

    // Save reviews
    const batch = firestoreAdmin.batch();
    reviews.forEach(review => {
      const reviewRef = firestoreAdmin!
        .collection('products')
        .doc(product.id)
        .collection('reviews')
        .doc();
      batch.set(reviewRef, review);
    });

    await batch.commit();
  }
}

async function seedFinancialData(vendorId: string) {
  console.log(`Seeding financial data for vendor ${vendorId}...`);

  if (!firestoreAdmin) {
    throw new Error('Firestore Admin is not initialized');
  }

  const earnings = [];
  const currentDate = new Date();

  for (let i = 0; i < seedConfig.historyMonths; i++) {
    const date = new Date();
    date.setMonth(currentDate.getMonth() - i);

    const monthEarnings = {
      month: date.toISOString().substring(0, 7),
      grossSales: faker.number.int({ min: 50000, max: 500000 }),
      commission: faker.number.int({ min: 5000, max: 50000 }),
      netEarnings: faker.number.int({ min: 45000, max: 450000 }),
      orderCount: faker.number.int({ min: 50, max: 200 }),
      productsSold: faker.number.int({ min: 100, max: 500 }),
      timestamp: Timestamp.fromDate(date)
    };

    earnings.push(monthEarnings);
  }

  // Save earnings data
  await firestoreAdmin
    .collection('vendors')
    .doc(vendorId)
    .collection('earnings')
    .doc('history')
    .set({ months: earnings });
}

async function seedAnalyticsData(vendorId: string) {
  console.log(`Seeding analytics data for vendor ${vendorId}...`);

  if (!firestoreAdmin) {
    throw new Error('Firestore Admin is not initialized');
  }

  const analytics: VendorAnalytics = {
    storeViews: {
      total: faker.number.int({ min: 1000, max: 10000 }),
      unique: faker.number.int({ min: 500, max: 5000 }),
      bounceRate: faker.number.float({ min: 20, max: 60 }),
      avgTimeSpent: faker.number.float({ min: 2, max: 10 })
    },
    productViews: {
      total: faker.number.int({ min: 5000, max: 50000 }),
      unique: faker.number.int({ min: 2500, max: 25000 }),
      conversionRate: faker.number.float({ min: 1, max: 5 })
    },
    customerMetrics: {
      total: faker.number.int({ min: 100, max: 1000 }),
      returning: faker.number.int({ min: 50, max: 500 }),
      avgOrderValue: faker.number.float({ min: 1000, max: 5000 })
    },
    lastUpdated: Timestamp.fromDate(new Date())
  };

  await firestoreAdmin
    .collection('vendors')
    .doc(vendorId)
    .collection('analytics')
    .doc('metrics')
    .set(analytics);
}

async function seedAllVendorData() {
  console.log('🚀 Starting vendor data seeding...\n');

  for (const vendorId of seedConfig.vendorIds) {
    console.log(`\nProcessing vendor: ${vendorId}`);
    
    await seedInventoryData(vendorId);
    await seedReviewData(vendorId);
    await seedFinancialData(vendorId);
    await seedAnalyticsData(vendorId);
    
    console.log(`✅ Completed seeding data for vendor: ${vendorId}`);
  }

  console.log('\n✨ All vendor data seeded successfully!');
}

// Run the seeding
seedAllVendorData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error seeding vendor data:', error);
    process.exit(1);
  });