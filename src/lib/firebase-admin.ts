
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage, type Storage as AdminStorage } from 'firebase-admin/storage';

// We will attempt to import the service account key.
// If this file doesn't exist, the import will fail, which is a clear error.
import serviceAccount from './zilacart-service-account.json';

let firebaseAdminAuth: Auth;
let firestoreAdmin: Firestore;
let storageAdmin: AdminStorage;

// This pattern prevents re-initializing the app on every hot-reload
if (!admin.apps.length) {
  try {
    // Validate the imported service account object
    if (!serviceAccount || !serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('The service account file (zilacart-service-account.json) is missing or incomplete. Please ensure it is present in src/lib and contains project_id, private_key, and client_email.');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as ServiceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });

  } catch (error: any) {
    // This block will catch errors from initializeApp AND from the validation check above.
    console.error("--------------------------------------------------------------------------------");
    console.error("### CRITICAL: FIREBASE ADMIN SDK INITIALIZATION FAILED ###");
    console.error("This is likely due to a malformed or missing `src/lib/zilacart-service-account.json` file.");
    console.error("Please ensure the file exists and is a valid JSON service account key from your Firebase project.");
    console.error("\nOriginal Error:", error.message);
    console.error("--------------------------------------------------------------------------------");
    // Throwing here will crash the server on startup, which is what we want
    // because the app is in an unusable state.
    throw new Error(`Firebase Admin SDK failed to initialize: ${error.message}`);
  }
}

// These are now guaranteed to be initialized if the above block doesn't throw.
firebaseAdminAuth = getAuth();
firestoreAdmin = getFirestore();
storageAdmin = getAdminStorage();

export { firebaseAdminAuth, firestoreAdmin, storageAdmin };
export default admin;
