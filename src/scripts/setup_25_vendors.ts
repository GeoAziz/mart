import { firestoreAdmin, firebaseAdminAuth } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { faker } from '@faker-js/faker';

async function setupVendors() {
  console.log('Setting up 25 vendors...');
  
  // 1. Create 25 Vendors in Auth and Firestore
  const vendorIds: string[] = [];
  const batch = firestoreAdmin.batch();
  
  for (let i = 1; i <= 25; i++) {
    const email = `vendor${i}@example.com`;
    const password = 'password123';
    const storeName = faker.company.name();
    let uid: string;
    
    try {
      const user = await firebaseAdminAuth.createUser({
        email,
        password,
        displayName: storeName
      });
      uid = user.uid;
      // Explicitly set the custom claim that grants dashboard access!
      await firebaseAdminAuth.setCustomUserClaims(uid, { role: 'vendor' });
    } catch (e: any) {
      if (e.code === 'auth/email-already-exists') {
        const user = await firebaseAdminAuth.getUserByEmail(email);
        uid = user.uid;
        await firebaseAdminAuth.updateUser(uid, { password, displayName: storeName });
        await firebaseAdminAuth.setCustomUserClaims(uid, { role: 'vendor' });
      } else {
        throw e;
      }
    }
    vendorIds.push(uid);
    
    const vendorRef = firestoreAdmin.collection('vendors').doc(uid);
    batch.set(vendorRef, {
      storeName: storeName,
      description: faker.company.catchPhrase(),
      logoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(storeName)}`,
      coverImageUrl: 'https://placehold.co/1200x400/png?text=Store+Cover',
      status: 'active',
      rating: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
      createdAt: Timestamp.now(),
    });
    
    // Also ensure they have a standard user profile required by the platform
    const userRef = firestoreAdmin.collection('users').doc(uid);
    batch.set(userRef, {
      name: storeName,
      email: email,
      role: 'vendor',
      createdAt: Timestamp.now()
    }, { merge: true });
  }
  await batch.commit();
  console.log('✅ Created 25 vendors with Auth & Firestore profiles');

  // 2. Redistribute Products
  console.log('Redistributing the 214 products across the 25 vendors...');
  const productsSnap = await firestoreAdmin.collection('products').get();
  const productVendorMap = new Map<string, string>(); 
  
  const productBatch = firestoreAdmin.batch();
  let pc = 0;
  for (const doc of productsSnap.docs) {
    const randomVendorId = faker.helpers.arrayElement(vendorIds);
    productVendorMap.set(doc.id, randomVendorId);
    productBatch.update(doc.ref, { vendorId: randomVendorId });
    pc++;
    // Firestore batches limit to 500, we have 214 so we're safe, but good practice
  }
  await productBatch.commit();
  console.log('✅ Redistributed products successfully');

  // 3. Patch Parent Orders (Inject vendorId into each order item)
  console.log('Patching existing customer orders to attribute sales to the correct vendors...');
  const ordersSnap = await firestoreAdmin.collection('orders').get();
  
  let orderCount = 0;
  for (const doc of ordersSnap.docs) {
    const data = doc.data();
    const items = data.items || [];
    let updated = false;
    
    for (const item of items) {
      if (item.productId && productVendorMap.has(item.productId)) {
        item.vendorId = productVendorMap.get(item.productId);
        updated = true;
      }
    }
    if (updated) {
      await doc.ref.update({ items });
      orderCount++;
    }
  }
  console.log(`✅ Patched ${orderCount} orders with correct vendor attribution.`);

  console.log('\nComplete! Run the backfill script next.');
  process.exit(0);
}

setupVendors().catch(console.error);

