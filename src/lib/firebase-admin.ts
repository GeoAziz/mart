
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage, type Storage as AdminStorage } from 'firebase-admin/storage';

// You must create a service account and download the JSON key file.
// Replace the path below with the actual path to your service account key file.
// DO NOT commit this key to your git repository.
let serviceAccount: ServiceAccount;
try {
    serviceAccount = require('../../../serviceAccountKey.json');
} catch (error) {
    console.error("--------------------------------------------------------------------------------");
    console.error("### CRITICAL: 'serviceAccountKey.json' NOT FOUND. ###");
    console.error("The Firebase Admin SDK requires this file for server-side authentication.");
    console.error("Please download it from your Firebase project settings and place it in the root directory of your project.");
    console.error("This is required for backend functionalities like user management and order processing.");
    console.error("--------------------------------------------------------------------------------");
    // We will allow the app to continue running so the frontend setup instructions can be displayed.
    // The API routes will fail gracefully if the Admin SDK is not initialized.
}

let firebaseAdminAuth: Auth;
let firestoreAdmin: Firestore;
let storageAdmin: AdminStorage;

// This pattern prevents re-initializing the app on every hot-reload
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: `${serviceAccount.projectId}.appspot.com`
    });
  } catch (error: any) {
    if (error.code !== 'app/duplicate-app') {
        console.error("Firebase Admin SDK initialization error:", error.message);
    }
  }
}

// These might not be initialized if the service account is missing.
// API routes using these should have checks to handle this.
try {
    firebaseAdminAuth = getAuth();
    firestoreAdmin = getFirestore();
    storageAdmin = getAdminStorage();
} catch (e) {
    // This catch block might be redundant if the app crashes on initializeApp,
    // but it's a safeguard.
    console.error("Failed to get Firebase Admin services. The service account might be missing or invalid.");
}


export { firebaseAdminAuth, firestoreAdmin, storageAdmin };
export default admin;
