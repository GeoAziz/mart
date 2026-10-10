import { firestoreAdmin, firebaseAdminAuth } from '@/lib/firebase-admin';

async function createAuthUsers() {
  console.log('Fetching a sample of users from Firestore...');
  
  try {
    // Get the first 5 users from the database
    const snapshot = await firestoreAdmin.collection('users').get();
    
    if (snapshot.empty) {
      console.log('No users found in Firestore. Did the import run successfully?');
      process.exit(1);
    }

    const defaultPassword = 'password123';
    console.log(`\nCreating Firebase Auth accounts with password: "${defaultPassword}"\n`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const uid = doc.id;
      const email = data.email;
      const name = data.name;

      if (!email) {
        console.log(`Skipping user ${uid} (No email found)`);
        continue;
      }

      try {
        // Try to create the Auth user with the EXACT SAME uid as the Firestore document
        await firebaseAdminAuth.createUser({
          uid: uid,
          email: email,
          password: defaultPassword,
          displayName: name,
        });
        console.log(`✅ Created Auth for: ${email} (UID: ${uid})`);
      } catch (error: any) {
        // If they already exist, just update their password so we know what it is
        if (error.code === 'auth/email-already-exists' || error.code === 'auth/uid-already-exists') {
          await firebaseAdminAuth.updateUser(uid, {
            password: defaultPassword,
          });
          console.log(`🔄 Updated existing Auth for: ${email} (UID: ${uid})`);
        } else {
          console.error(`❌ Failed to create Auth for ${email}:`, error.message);
        }
      }
    }
    
    console.log('\nDone! You can now log into the frontend using these emails and "password123".');
    process.exit(0);
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

createAuthUsers();

