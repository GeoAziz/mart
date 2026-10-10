import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';

async function main() {
  const ordersSnap = await firestoreAdmin.collection('orders').limit(1).get();
  console.log('Sample order data:', ordersSnap.docs[0].data());
}

main().catch(console.error);
