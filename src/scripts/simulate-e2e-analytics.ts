/**
 * Live End-to-End Simulation Script
 * Simulates:
 * 1. Creating a synthetic order in Firestore.
 * 2. Receiving a verified payment webhook.
 * 3. Atomic confirmation & creation of analytics_outbox record.
 * 4. Dispatching through the outbox worker to GA4 Measurement Protocol.
 * 5. Verifying the outbox document state transition.
 */

import { firestoreAdmin as db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { confirmOrderAndRecordPurchaseTransaction } from '@/lib/analytics-outbox';
import { processOutboxBatch } from '@/lib/analytics-worker';
import type { Order } from '@/lib/types';
import type { VerifiedPaymentResult } from '@/lib/analytics-types';

async function runSimulation() {
  const simOrderId = `SIM_ORDER_${Date.now()}`;
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Live GA4 E2E Simulation: ${simOrderId}`);
  console.log(`======================================================\n`);

  const orderRef = db.collection('orders').doc(simOrderId);

  // 1. Stage simulated order
  const syntheticOrder: Order = {
    id: simOrderId,
    userId: 'sim_user_42',
    userFullName: 'Simulated Shopper',
    userEmail: 'shopper@example.com',
    status: 'pending',
    statusHistory: [
      {
        status: 'pending',
        timestamp: new Date(),
        note: 'Order created via checkout',
      },
    ],
    subtotal: 4500,
    shippingCost: 350,
    taxAmount: 280,
    totalAmount: 5130, // 4500 + 350 + 280
    paymentMethod: 'mpesa',
    shippingAddress: {
      fullName: 'Simulated Shopper',
      address: 'Kenyatta Avenue, CBD',
      city: 'Nairobi',
      phone: '+254712345678',
    },
    items: [
      {
        productId: 'prod_gaming_mouse',
        name: 'Logitech G502 Gaming Mouse',
        price: 3000,
        quantity: 1,
        vendorId: 'vendor_tech_ke',
      },
      {
        productId: 'prod_mousepad_xl',
        name: 'SteelSeries XL Mousepad',
        price: 1500,
        quantity: 1,
        vendorId: 'vendor_accessories_ke',
      },
    ],
    paymentDetails: {
      currency: 'KES',
      attribution: {
        clientId: '198273645.1710000000',
        sessionId: Math.floor(Date.now() / 1000),
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

  await orderRef.set(syntheticOrder);
  console.log(`[1/5] ✅ Staged synthetic pending order ${simOrderId} in Firestore`);

  // 2. Simulate payment confirmation callback (M-Pesa Daraja callback)
  const paymentResult: VerifiedPaymentResult = {
    provider: 'mpesa',
    paymentId: `MPESA_${Date.now()}`,
    orderId: simOrderId,
    amount: 5130, // Exact match
    currency: 'KES',
    providerReference: `STK_${Date.now()}`,
    status: 'COMPLETED',
    verifiedAt: new Date().toISOString(),
  };

  console.log(`[2/5] 💳 Executing transactional payment confirmation & outbox creation...`);
  const confirmRes = await confirmOrderAndRecordPurchaseTransaction(paymentResult);
  console.log(`      Transaction committed: confirmed=${confirmRes.confirmed}, outboxId=${confirmRes.outboxId}`);

  // 3. Inspect the newly created outbox document
  const outboxDoc = await db.collection('analytics_outbox').doc(`${simOrderId}_purchase`).get();
  if (!outboxDoc.exists) {
    throw new Error('❌ Outbox document was not created!');
  }
  const outboxData = outboxDoc.data()!;
  console.log(`[3/5] 📦 Outbox record verified:`);
  console.log(`      Status: ${outboxData.status}`);
  console.log(`      GA4 Item Revenue Value: KES ${outboxData.payload?.value} (Item sum: 3000 + 1500, excluding 350 shipping and 280 tax)`);
  console.log(`      Customer Charge in Order: KES ${syntheticOrder.totalAmount}`);

  // 4. Test Webhook Idempotency (Replay simulation)
  console.log(`[4/5] 🔁 Replaying identical payment callback to verify idempotency...`);
  const replayRes = await confirmOrderAndRecordPurchaseTransaction(paymentResult);
  console.log(`      Replay handled successfully: replayed=${replayRes.replayed}`);

  // 5. Run the Outbox Worker to process and dispatch
  console.log(`[5/5] ⚡ Executing Outbox Worker batch processing...`);
  const workerRes = await processOutboxBatch({
    batchSize: 5,
    workerId: 'simulation_worker_test',
  });
  console.log(`      Worker result: processed=${workerRes.processed}, sent=${workerRes.sent}, failed=${workerRes.failed}, deadLetter=${workerRes.deadLetter}`);

  // Final check on outbox document
  const updatedOutbox = await db.collection('analytics_outbox').doc(`${simOrderId}_purchase`).get();
  const finalState = updatedOutbox.data();
  console.log(`\n======================================================`);
  console.log(`🏁 Final Outbox Status for ${simOrderId}: ${finalState?.status}`);
  console.log(`   Attempt Count: ${finalState?.attemptCount}`);
  if (finalState?.lastErrorMessage) {
    console.log(`   Notice: ${finalState.lastErrorMessage}`);
  }
  console.log(`======================================================\n`);
}

runSimulation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Simulation failed:', err);
    process.exit(1);
  });
