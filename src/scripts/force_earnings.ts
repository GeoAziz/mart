import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

async function main() {
  const vendorsSnap = await firestoreAdmin.collection('vendors').get();
  console.log(`Found ${vendorsSnap.size} vendors.`);
  
  let count = 0;
  for (const doc of vendorsSnap.docs) {
    const vendorId = doc.id;
    
    const ledgerRef = firestoreAdmin.collection('users').doc(vendorId).collection('ledgerEntries').doc();
    await ledgerRef.set({
      vendorId,
      type: 'sale_credit',
      amount: 15000,
      commissionRate: 0.1,
      commissionAmount: 1500,
      netAmount: 13500,
      orderId: 'mock-order-123',
      status: 'confirmed',
      description: 'System override: Bonus sale for testing',
      createdAt: Timestamp.now(),
    });
    count++;
  }
  console.log(`Forced earnings for ${count} vendors.`);
}

main().catch(console.error);
