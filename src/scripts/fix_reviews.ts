import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';

async function main() {
  const reviewsSnap = await firestoreAdmin.collection('reviews').get();
  let updated = 0;
  for (const doc of reviewsSnap.docs) {
    const data = doc.data();
    let needsUpdate = false;
    const updates: any = {};

    if (data.text && !data.comment) {
      updates.comment = data.text;
      needsUpdate = true;
    }

    if (!data.vendorId || !data.customerName || !data.productName) {
      // Find the product to get vendorId and productName
      if (data.productId) {
        const prodDoc = await firestoreAdmin.collection('products').doc(data.productId).get();
        if (prodDoc.exists) {
          const prodData = prodDoc.data();
          if (!data.vendorId && prodData?.vendorId) {
            updates.vendorId = prodData.vendorId;
            needsUpdate = true;
          }
          if (!data.productName && prodData?.name) {
            updates.productName = prodData.name;
            needsUpdate = true;
          }
        }
      }

      // Find the user to get customerName
      if (data.userId) {
        const userDoc = await firestoreAdmin.collection('users').doc(data.userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const name = userData?.displayName || userData?.name || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim();
          if (name && !data.customerName) {
            updates.customerName = name;
            needsUpdate = true;
          }
        }
      }
    }

    if (needsUpdate) {
      await doc.ref.update(updates);
      updated++;
    }
  }
  console.log(`Updated ${updated} reviews.`);
}

main().catch(console.error);
