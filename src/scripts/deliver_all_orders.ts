import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { LedgerEntry } from '@/lib/types';

async function main() {
  const vendorOrdersSnap = await firestoreAdmin.collection('vendorOrders').where('status', '!=', 'delivered').get();
  // Process all of them to be safe
  const docs = vendorOrdersSnap.docs;
  
  let delivered = 0;
  for (const doc of docs) {
    const data = doc.data();
    const vendorOrderRef = doc.ref;

    await firestoreAdmin.runTransaction(async (transaction) => {
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

      const ledgerRef = firestoreAdmin.collection('users').doc(data.vendorId).collection('ledgerEntries').doc();
      transaction.set(ledgerRef, {
        ...ledgerEntry,
        createdAt: Timestamp.now(),
      });
    });

    if (data.orderId) {
      await firestoreAdmin.collection('orders').doc(data.orderId).update({
        status: 'delivered',
        updatedAt: Timestamp.now(),
      });
    }

    delivered++;
    if (delivered % 100 === 0) console.log(`Delivered ${delivered}...`);
  }
  
  console.log(`Delivered all ${delivered} vendor orders and created ledger entries.`);
}

main().catch(console.error);
