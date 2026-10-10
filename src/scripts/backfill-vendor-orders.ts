/**
 * Backfill vendorOrders for existing orders
 * ------------------------------------------
 * The VendorOrder split was introduced after the initial data model shipped.
 * Existing orders live in the `orders` collection as flat documents with
 * `items[].vendorId`. This script creates one VendorOrder per vendor for every
 * order that does not already have vendorOrders, so payouts, refunds, and
 * vendor analytics can be derived consistently.
 *
 * HOW TO RUN:
 *   npx tsx src/scripts/backfill-vendor-orders.ts
 */

import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Order } from '@/lib/types';
import { computeVendorOrderSplits, groupItemsByVendor, type VendorSplitContext } from '@/lib/vendor-order-split';
import { deriveParentOrderStatus } from '@/lib/order-state-machine';
import type { VendorOrderStatus } from '@/lib/types';

async function main() {
  const ordersSnapshot = await firestoreAdmin.collection('orders').get();
  let created = 0;
  let skipped = 0;

  for (const orderDoc of ordersSnapshot.docs) {
    const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
    const existing = await firestoreAdmin
      .collection('vendorOrders')
      .where('orderId', '==', order.id!)
      .limit(1)
      .get();

    if (!existing.empty) {
      skipped++;
      continue;
    }

    const items = order.items ?? [];
    const vendorItems = groupItemsByVendor(items);
    if (vendorItems.size === 0) {
      skipped++;
      continue;
    }

    const ctx: VendorSplitContext = {
      orderId: order.id,
      customerId: order.userId,
      customerName: order.userFullName ?? 'Unknown Customer',
      customerEmail: order.userEmail ?? 'unknown@example.com',
      shippingAddress: order.shippingAddress ?? {
        street: 'Unknown',
        city: 'Unknown',
        state: 'Unknown',
        zipCode: '00000',
        country: 'Unknown'
      },
      subtotal: order.subtotal ?? order.totalAmount ?? 0,
      discountAmount: order.discountAmount ?? 0,
      taxRate: order.subtotal && order.subtotal > 0 ? (order.taxAmount || 0) / (order.subtotal - (order.discountAmount ?? 0)) : 0.16,
      shippingCost: order.shippingCost ?? 0,
      estimatedDeliveryDate: order.estimatedDeliveryDate ?? null,
    };

    const vendorInputs = [];
    for (const [vendorId, vendorOrderItems] of vendorItems.entries()) {
      let vendorName = 'Unknown Vendor';
      try {
        const vendorDoc = await firestoreAdmin.collection('vendors').doc(vendorId).get();
        if (vendorDoc.exists) vendorName = vendorDoc.data()?.storeName || vendorName;
      } catch (e) {}
      vendorInputs.push({ vendorId, vendorName, items: vendorOrderItems });
    }

    const drafts = computeVendorOrderSplits(vendorInputs, ctx);

    for (const draft of drafts) {
      await firestoreAdmin.collection('vendorOrders').add({
        ...draft,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      });
    }
    created++;

    // Realign the parent order status to the most advanced vendor stage.
    const statuses: VendorOrderStatus[] = drafts.map((d) => d.status);
    const derived = deriveParentOrderStatus(statuses);
    if (derived) {
      await firestoreAdmin.collection('orders').doc(order.id!).update({
        status: derived,
        updatedAt: Timestamp.now(),
      });
    }
  }

  console.log(`Backfill complete. Created ${created} vendorOrders, skipped ${skipped} orders.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
