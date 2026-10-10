import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';

async function main() {
  const usersSnap = await firestoreAdmin.collection('users').get();
  let totalLedgers = 0;
  for (const userDoc of usersSnap.docs) {
    const ledgersSnap = await userDoc.ref.collection('ledgerEntries').get();
    totalLedgers += ledgersSnap.size;
    if (ledgersSnap.size > 0) {
      console.log(`User ${userDoc.id} has ${ledgersSnap.size} ledger entries.`);
      console.log('Sample entry:', ledgersSnap.docs[0].data());
      break;
    }
  }
  console.log(`Total ledger entries found across all users: ${totalLedgers}`);
}

main().catch(console.error);
