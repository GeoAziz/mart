import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';

async function checkLedger() {
  const usersRef = firestoreAdmin.collection('users');
  const usersSnap = await usersRef.get();
  let totalLedgerEntries = 0;
  for (const doc of usersSnap.docs) {
    const ledgerSnap = await doc.ref.collection('ledgerEntries').get();
    if (!ledgerSnap.empty) {
      console.log(`User ${doc.id} has ${ledgerSnap.size} ledger entries`);
      totalLedgerEntries += ledgerSnap.size;
    }
  }
  console.log(`Total ledger entries across all users: ${totalLedgerEntries}`);

  const vendorOrdersSnap = await firestoreAdmin.collection('vendorOrders').get();
  console.log(`Total vendor orders: ${vendorOrdersSnap.size}`);
  const deliveredVendorOrders = vendorOrdersSnap.docs.filter(d => d.data().status === 'delivered');
  console.log(`Total delivered vendor orders: ${deliveredVendorOrders.length}`);
}

checkLedger().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

