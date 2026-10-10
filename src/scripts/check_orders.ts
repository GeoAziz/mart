import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';

async function main() {
  const orders = await firestoreAdmin.collection('orders').get();
  const delivered = orders.docs.filter(d => d.data().status === 'delivered');
  const vendorOrders = await firestoreAdmin.collection('vendorOrders').get();
  const voDelivered = vendorOrders.docs.filter(d => d.data().status === 'delivered');
  console.log(`Total orders: ${orders.size}, Delivered: ${delivered.length}`);
  console.log(`Total vendorOrders: ${vendorOrders.size}, Delivered: ${voDelivered.length}`);
}

main().catch(console.error);
