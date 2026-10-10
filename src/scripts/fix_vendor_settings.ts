import { firestoreAdmin } from '../lib/firebase-admin';

async function fixVendors() {
  const vendorsSnap = await firestoreAdmin.collection('vendors').get();
  const batch = firestoreAdmin.batch();
  
  let count = 0;
  for (const doc of vendorsSnap.docs) {
    const data = doc.data();
    const settingsRef = firestoreAdmin.collection('vendorSettings').doc(doc.id);
    
    // Check if settings exist
    const settingsDoc = await settingsRef.get();
    if (!settingsDoc.exists) {
      batch.set(settingsRef, {
        storeName: data.storeName || 'Unnamed Store',
        storeDescription: data.description || '',
        logoUrl: data.logoUrl || '',
        bannerUrl: data.coverImageUrl || '',
        contactEmail: `vendor_${doc.id}@example.com`,
        contactPhone: '+254700000000',
        businessType: 'individual',
        isSetupComplete: true,
        onboardingIncomplete: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      count++;
    }
  }
  
  await batch.commit();
  console.log(`✅ Created vendorSettings for ${count} vendors`);
}

fixVendors().catch(console.error).finally(() => process.exit(0));
