import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';

async function main() {
  const usersSnap = await firestoreAdmin.collection('users').get();
  
  let fixed = 0;
  for (const userDoc of usersSnap.docs) {
    const ledgersSnap = await userDoc.ref.collection('ledgerEntries').get();
    
    for (const doc of ledgersSnap.docs) {
      const data = doc.data();
      if (data.type === 'sale_credit' && (data.amount === 0 || data.amount == null)) {
        // Fetch the corresponding vendorOrder
        const vendorOrdersSnap = await firestoreAdmin.collection('vendorOrders')
          .where('orderId', '==', data.orderId)
          .where('vendorId', '==', data.vendorId)
          .limit(1)
          .get();
          
        if (!vendorOrdersSnap.empty) {
          const voData = vendorOrdersSnap.docs[0].data();
          const amount = voData.totalAmount || voData.total || voData.subtotal || 0;
          if (amount > 0) {
            const commissionRate = data.commissionRate || 0.1;
            const commissionAmount = amount * commissionRate;
            const netAmount = amount - commissionAmount;
            
            await doc.ref.update({
              amount,
              commissionAmount,
              netAmount
            });
            fixed++;
          }
        }
      }
    }
  }
  
  console.log(`Fixed amounts for ${fixed} ledger entries.`);
}

main().catch(console.error);
