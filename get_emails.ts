import { firestoreAdmin } from './src/lib/firebase-admin';

async function run() {
  const vendors = await firestoreAdmin.collection('users').where('role', '==', 'vendor').limit(5).get();
  const customers = await firestoreAdmin.collection('users').where('role', '==', 'customer').limit(5).get();
  
  console.log("Vendors:");
  vendors.forEach(d => console.log(d.data().email));
  
  console.log("\nCustomers:");
  customers.forEach(d => console.log(d.data().email));
}
run().catch(console.error).finally(() => process.exit(0));
