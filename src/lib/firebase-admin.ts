import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
import fs from 'fs';

// Only initialize on server side
if (typeof window === 'undefined' && !admin.apps.length) {
  try {
    // Try to load service account from file
    const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    let serviceAccount: ServiceAccount;

    if (fs.existsSync(keyPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    } else {
      // Fallback to environment variables
      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as ServiceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
  }
}

export const firestoreAdmin = getFirestore();
export const storageAdmin = getStorage();
export const auth = getAuth();

export default admin;
