import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { LedgerEntry } from '@/lib/types';
import { deriveParentOrderStatus } from '@/lib/order-state-machine';

async function main() {
  const vendorOrdersSnap = await firestoreAdmin.collection('vendorOrders').where('status', '!=', 'delivered').get();
  const docs = vendorOrdersSnap.docs.slice(0, 50); // Just do 50 for testing
  
  let delivered = 0;
  for (const doc of docs) {
    const data = doc.data();
    const vendorOrderRef = doc.ref;

    await firestoreAdmin.runTransaction(async (transaction) => {
      // 1. Update vendor order
      const tracking = {
        status: 'delivered',
        timestamp: new Date(),
        note: 'Backfilled delivery for test data',
        updatedBy: 'admin',
      };

      transaction.update(vendorOrderRef, {
        status: 'delivered',
        statusHistory: FieldValue.arrayUnion(tracking),
        updatedAt: Timestamp.now(),
        actualDeliveryDate: Timestamp.now(),
      });

      // 2. Create ledger entry
      const subtotal = data.subtotal || 0;
      const commissionRate = data.commissionRate || 0.1;
      const commissionAmount = subtotal * commissionRate;
      const netAmount = subtotal - commissionAmount;

      const ledgerEntry: Omit<LedgerEntry, 'id' | 'createdAt'> = {
        vendorId: data.vendorId,
        type: 'sale_credit',
        amount: subtotal,
        commissionRate,
        commissionAmount,
        netAmount,
        orderId: data.orderId,
        status: 'confirmed',
        description: `Sale of ${data.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 1} items`,
      };

      const ledgerRef = firestoreAdmin
        .collection('users')
        .doc(data.vendorId)
        .collection('ledgerEntries')
        .doc();
        
      transaction.set(ledgerRef, {
        ...ledgerEntry,
        createdAt: Timestamp.now(),
      });
    });

    // 3. Update parent order status
    if (data.orderId) {
      const allVendorOrders = await firestoreAdmin.collection('vendorOrders').where('orderId', '==', data.orderId).get();
      // note: one is already updated but we might be fetching stale data from non-transaction. 
      // It's ok for a test script, we just force update parent to delivered.
      await firestoreAdmin.collection('orders').doc(data.orderId).update({
        status: 'delivered',
        updatedAt: Timestamp.now(),
      });
    }

    delivered++;
  }
  
  console.log(`Delivered ${delivered} test vendor orders and created ledger entries.`);
}

main().catch(console.error);
