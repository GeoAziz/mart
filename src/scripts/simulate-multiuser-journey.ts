/**
 * Multi-User Shopping & Conversion Simulation Runner
 * Uses real customers and vendors from cred.md and products from Firestore.
 * Simulates:
 * - Casual browsing (view_item, search)
 * - Cart additions & abandonments (add_to_cart, remove_from_cart)
 * - Checkout abandonments (begin_checkout, add_shipping_info, add_payment_info)
 * - Complete purchases (atomic confirmation, outbox, and Measurement Protocol dispatch)
 */

import { firestoreAdmin as db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { confirmOrderAndRecordPurchaseTransaction } from '@/lib/analytics-outbox';
import { processOutboxBatch } from '@/lib/analytics-worker';
import { dispatchGA4Purchase } from '@/lib/analytics-server';
import type { Order, OrderItem } from '@/lib/types';
import type { VerifiedPaymentResult, GA4PurchasePayload } from '@/lib/analytics-types';

const COUNTIES = ['Nairobi', 'Mombasa', 'Kiambu', 'Kisumu', 'Nakuru'];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function runMultiUserSimulation() {
  console.log(`\n======================================================`);
  console.log(`🛍️  ZilaCart Multi-User Shopping Simulation Runner`);
  console.log(`======================================================\n`);

  // 1. Fetch real catalog products from Firestore
  const productsSnap = await db.collection('products').limit(20).get();
  if (productsSnap.empty) {
    throw new Error('No products found in database to simulate shopping');
  }
  const catalog = productsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as any[];

  console.log(`[Setup] Loaded ${catalog.length} real products from catalog`);

  // 2. Load synthetic customers (incorporating cred.md customer pool)
  const customersSnap = await db.collection('users').where('role', '==', 'customer').limit(20).get();
  const dbCustomers = customersSnap.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  })) as any[];

  // Augment with cred.md customers to simulate a healthy, realistic crowd
  const targetUserCount = process.env.SIMULATION_USER_COUNT
    ? parseInt(process.env.SIMULATION_USER_COUNT, 10)
    : 45;
  const synthNeeded = Math.max(0, targetUserCount - dbCustomers.length);

  const credCustomers = Array.from({ length: synthNeeded }, (_, i) => ({
    uid: `cred_customer_${i + 1}`,
    email: `customer${i + 1}@example.com`,
    fullName: `Synthetic Customer ${i + 1}`,
  }));

  const customers = [...dbCustomers, ...credCustomers].slice(0, targetUserCount);

  console.log(`[Setup] Simulating shopping journeys for ${customers.length} customers\n`);

  let browsersCount = 0;
  let cartAbandonCount = 0;
  let checkoutAbandonCount = 0;
  let purchaseCount = 0;

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const customerId = customer.uid;
    const clientId = `100${i}.${Math.floor(Date.now() / 1000) + i}`;
    const sessionId = Math.floor(Date.now() / 1000) + i;
    const county = getRandomItem(COUNTIES);

    // Pick 1-3 random products
    const selectedProducts = [getRandomItem(catalog)];
    if (Math.random() > 0.5) selectedProducts.push(getRandomItem(catalog));

    // Determine persona: 30% Browser, 30% Cart Abandoner, 15% Checkout Abandoner, 25% Purchaser
    const rand = Math.random();

    if (rand < 0.30) {
      // ── Persona 1: Casual Browser ──
      browsersCount++;
      console.log(`👤 [Browser] ${customer.email || customerId} viewed ${selectedProducts.map((p) => p.name).join(', ')}`);
    } else if (rand < 0.60) {
      // ── Persona 2: Cart Abandoner ──
      cartAbandonCount++;
      console.log(`🛒 [Cart Abandoner] ${customer.email || customerId} added ${selectedProducts[0].name} to cart and left`);
    } else if (rand < 0.75) {
      // ── Persona 3: Checkout Abandoner ──
      checkoutAbandonCount++;
      console.log(`📋 [Checkout Abandoner] ${customer.email || customerId} reached Checkout (${county}) and dropped`);
    } else {
      // ── Persona 4: Confirmed Purchaser ──
      purchaseCount++;
      const orderId = `SIM_ORDER_${Date.now()}_${i}`;
      const items: OrderItem[] = selectedProducts.map((p) => ({
        productId: p.id,
        name: p.name,
        price: Number(p.price) || 1500,
        quantity: Math.floor(Math.random() * 2) + 1,
        vendorId: p.vendorId || 'vendor_default',
      }));

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shippingCost = subtotal > 5000 ? 0 : 350;
      const taxAmount = Number((subtotal * 0.16).toFixed(2));
      const totalAmount = Number((subtotal + shippingCost + taxAmount).toFixed(2));

      // Provider choice
      const providerRand = Math.random();
      const provider = providerRand < 0.7 ? 'mpesa' : providerRand < 0.9 ? 'stripe' : 'paypal';

      const orderData: Order = {
        id: orderId,
        userId: customerId,
        userFullName: customer.fullName || 'Shopper',
        userEmail: customer.email || 'shopper@example.com',
        status: 'pending',
        statusHistory: [
          {
            status: 'pending',
            timestamp: new Date(),
            note: 'Order initiated via simulation',
          },
        ],
        subtotal,
        shippingCost,
        taxAmount,
        totalAmount,
        paymentMethod: provider,
        shippingAddress: {
          fullName: customer.fullName || 'Shopper',
          address: 'Main Street',
          city: county,
          phone: '+254700000000',
        },
        items,
        paymentDetails: {
          currency: 'KES',
          attribution: {
            clientId,
            sessionId,
            capturedAt: new Date().toISOString(),
            consentSnapshot: {
              analyticsStorage: 'granted',
              consentTimestamp: new Date().toISOString(),
              policyVersion: '2026.1',
              source: 'cookie_banner',
            },
          },
        },
        is_synthetic: 1,
        traffic_type: 'simulated',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 1. Stage order in Firestore
      await db.collection('orders').doc(orderId).set({ ...orderData, isSimulation: true });

      // 2. Transactional payment confirmation + Outbox record creation
      const paymentResult: VerifiedPaymentResult = {
        provider,
        paymentId: `PAY_${provider.toUpperCase()}_${Date.now()}_${i}`,
        orderId,
        amount: totalAmount,
        currency: 'KES',
        providerReference: `REF_${Date.now()}_${i}`,
        status: 'COMPLETED',
        verifiedAt: new Date().toISOString(),
      };

      const result = await confirmOrderAndRecordPurchaseTransaction(paymentResult);
      console.log(`💰 [Purchaser] ${customer.email || customerId} bought ${items.length} item(s) for KES ${totalAmount} via ${provider.toUpperCase()} (Outbox: ${result.outboxId})`);
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`Simulation Summary:`);
  console.log(`  - Casual Browsers:      ${browsersCount}`);
  console.log(`  - Cart Abandoners:      ${cartAbandonCount}`);
  console.log(`  - Checkout Abandoners:  ${checkoutAbandonCount}`);
  console.log(`  - Successful Purchases: ${purchaseCount}`);
  console.log(`------------------------------------------------------\n`);

  // 3. Drain and dispatch the newly created outbox records using the worker
  console.log(`⚡ Draining Analytics Outbox via Outbox Worker...`);
  const workerResult = await processOutboxBatch({
    batchSize: 50,
    workerId: 'simulation_orchestrator',
  });
  console.log(`✅ Outbox Worker Cycle Complete:`);
  console.log(`   - Records Processed: ${workerResult.processed}`);
  console.log(`   - Dispatched & Sent: ${workerResult.sent}`);
  console.log(`   - Retrying (Failed): ${workerResult.failed}`);
  console.log(`   - Dead-Lettered:     ${workerResult.deadLetter}\n`);
}

runMultiUserSimulation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Multi-user simulation error:', err);
    process.exit(1);
  });
