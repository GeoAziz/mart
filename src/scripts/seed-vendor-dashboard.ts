import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { faker } from '@faker-js/faker';
import type { LedgerEntry, Order, Product, UserProfile } from '@/lib/types';

const COMMISSION_RATE = 0.10; // 10% platform commission

interface VendorMetrics {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalEarnings: number;
  pendingPayouts: number;
  activeCustomers: number;
  productViews: number;
  storeViews: number;
  ordersByStatus: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  lowStockProducts: number;
}

async function generateVendorDashboardData(vendorId: string) {
  try {
    console.log(`Generating dashboard data for vendor: ${vendorId}`);

    // 1. Generate Recent Orders (Last 30 days)
    const orderStatuses: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const numOrders = faker.number.int({ min: 20, max: 50 });
    
    if (!firestoreAdmin) {
      throw new Error('firestoreAdmin is undefined. Please check your Firebase Admin initialization.');
    }

    for (let i = 0; i < numOrders; i++) {
      const numItems = faker.number.int({ min: 1, max: 3 });
      const subtotal = faker.number.int({ min: 1000, max: 50000 });
      const shippingCost = subtotal > 5000 ? 0 : 500;
      const taxAmount = subtotal * 0.16;
      const totalAmount = subtotal + shippingCost + taxAmount;
      
      // Create random date within last 30 days
      const orderDate = faker.date.recent({ days: 30 });

      const order: Omit<Order, 'id'> = {
        userId: `customer_${faker.string.uuid()}`,
        userFullName: faker.person.fullName(),
        userEmail: faker.internet.email(),
        items: Array(numItems).fill(null).map(() => ({
          productId: faker.string.uuid(),
          name: faker.commerce.productName(),
          quantity: faker.number.int({ min: 1, max: 5 }),
          price: faker.number.int({ min: 500, max: 10000 }),
          imageUrl: `https://placehold.co/200x200/2563eb/ffffff?text=Product`,
          vendorId: vendorId,
        })),
        shippingAddress: {
          fullName: faker.person.fullName(),
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          phone: faker.phone.number('+254#########'),
        },
        paymentMethod: faker.helpers.arrayElement(['M-Pesa', 'Card']),
        status: faker.helpers.arrayElement(orderStatuses),
        statusHistory: [
          {
            status: 'pending',
            timestamp: orderDate,
          },
        ],
        subtotal,
        shippingCost,
        taxAmount,
        totalAmount,
        createdAt: orderDate,
        updatedAt: orderDate,
        vendorIds: [vendorId],
      };

      // Save order to Firestore
      await firestoreAdmin.collection('orders').add(order);

      // If order is delivered, create ledger entry
      if (order.status === 'delivered') {
        const grossAmount = order.totalAmount;
        const commissionAmount = grossAmount * COMMISSION_RATE;
        const netAmount = grossAmount - commissionAmount;

        const ledgerEntry: Omit<LedgerEntry, 'id'> = {
          vendorId: vendorId,
          type: 'sale_credit',
          amount: grossAmount,
          commissionRate: COMMISSION_RATE,
          commissionAmount: commissionAmount,
          netAmount: netAmount,
          orderId: faker.string.uuid(),
          createdAt: orderDate,
          description: `Sale of ${order.items.length} items`,
        };

        await firestoreAdmin
          .collection('users')
          .doc(vendorId)
          .collection('ledgerEntries')
          .add(ledgerEntry);
      }
    }

    // 2. Generate Product Analytics
    const products = await firestoreAdmin
      .collection('products')
      .where('vendorId', '==', vendorId)
      .get();

    for (const product of products.docs) {
      // Update product with random stock and view counts
      await product.ref.update({
        stockQuantity: faker.number.int({ min: 0, max: 100 }),
        viewCount: faker.number.int({ min: 10, max: 1000 }),
        lastViewedAt: faker.date.recent({ days: 7 }),
      });
    }

    // 3. Generate Store Analytics
    const storeAnalytics = {
      totalViews: faker.number.int({ min: 100, max: 5000 }),
      uniqueVisitors: faker.number.int({ min: 50, max: 2000 }),
      averageTimeSpent: faker.number.float({ min: 1, max: 10 }),
      bounceRate: faker.number.float({ min: 20, max: 60 }),
      lastUpdated: new Date(),
    };

    await firestoreAdmin
      .collection('vendors')
      .doc(vendorId)
      .collection('analytics')
      .doc('store_metrics')
      .set(storeAnalytics);

    // 4. Calculate Vendor Metrics
    const metrics: VendorMetrics = {
      totalSales: faker.number.int({ min: 50000, max: 500000 }),
      totalOrders: numOrders,
      totalProducts: products.size,
      totalEarnings: faker.number.int({ min: 25000, max: 250000 }),
      pendingPayouts: faker.number.int({ min: 0, max: 50000 }),
      activeCustomers: faker.number.int({ min: 10, max: 100 }),
      productViews: faker.number.int({ min: 100, max: 1000 }),
      storeViews: faker.number.int({ min: 50, max: 500 }),
      ordersByStatus: {
        pending: faker.number.int({ min: 0, max: 10 }),
        processing: faker.number.int({ min: 0, max: 10 }),
        shipped: faker.number.int({ min: 0, max: 10 }),
        delivered: faker.number.int({ min: 10, max: 50 }),
        cancelled: faker.number.int({ min: 0, max: 5 }),
      },
      lowStockProducts: faker.number.int({ min: 0, max: 5 }),
    };

    await firestoreAdmin
      .collection('vendors')
      .doc(vendorId)
      .collection('dashboard')
      .doc('metrics')
      .set({
        ...metrics,
        lastUpdated: new Date(),
      });

    console.log(`✅ Dashboard data generated for vendor: ${vendorId}`);
    return metrics;

  } catch (error) {
    console.error(`Error generating dashboard data for vendor ${vendorId}:`, error);
    throw error;
  }
}

async function seedAllVendorsDashboards() {
  console.log('🚀 Starting Vendor Dashboard Data Seeding...');

  try {
    if (!firestoreAdmin) {
      throw new Error('firestoreAdmin is undefined. Please check your Firebase Admin initialization.');
    }
    // Get all vendors
    const vendorsSnapshot = await firestoreAdmin
      .collection('users')
      .where('role', '==', 'vendor')
      .get();

    console.log(`Found ${vendorsSnapshot.size} vendors to seed dashboard data for.`);

    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data() as UserProfile;
      
      console.log(`\nProcessing vendor: ${vendorData.email}`);
      const metrics = await generateVendorDashboardData(vendorId);
      
      console.log('Generated Metrics:', {
        totalOrders: metrics.totalOrders,
        totalSales: `KSh ${metrics.totalSales.toLocaleString()}`,
        totalProducts: metrics.totalProducts,
        activeCustomers: metrics.activeCustomers,
      });
    }

    console.log('\n✅ Vendor dashboard data seeding completed successfully!');
    console.log('🎯 You can now view realistic data in vendor dashboards.');

  } catch (error) {
    console.error('❌ Error seeding vendor dashboard data:', error);
    throw error;
  }
}

// Run the seeding
seedAllVendorsDashboards()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });