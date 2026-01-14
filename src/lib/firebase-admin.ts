import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
import fs from 'fs';

// On Vercel, serviceAccountKey.json is NOT available. All credentials must be provided via environment variables.
// Required env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET

function getServiceAccountFromEnv(): ServiceAccount {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey && privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('[Firebase Admin] Missing required env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }
  return {
    projectId: String(projectId),
    clientEmail: String(clientEmail),
    privateKey: String(privateKey),
  };
}

// Only initialize on server side
if (typeof window === 'undefined' && !admin.apps.length) {
  try {
    // Try to load service account from file (for local dev), else use env vars (for Vercel)
    const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    let serviceAccount: ServiceAccount;

    if (fs.existsSync(keyPath)) {
      const rawKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      // Handle both camelCase and snake_case keys from Firebase JSON
      const projectId = rawKey.projectId || rawKey.project_id;
      const clientEmail = rawKey.clientEmail || rawKey.client_email;
      const privateKey = rawKey.privateKey || rawKey.private_key;
      
      if (!projectId || typeof projectId !== 'string') {
        throw new Error('Service account object must contain a string "projectId" property.');
      }
      if (!clientEmail || typeof clientEmail !== 'string') {
        throw new Error('Service account object must contain a string "clientEmail" property.');
      }
      if (!privateKey || typeof privateKey !== 'string') {
        throw new Error('Service account object must contain a string "privateKey" property.');
      }
      
      // Map to expected keys for admin.credential.cert
      serviceAccount = {
        projectId,
        clientEmail,
        privateKey,
      };
    } else {
      serviceAccount = getServiceAccountFromEnv();
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as ServiceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
    throw error;
  }
}

// Named exports for compatibility
export const firestoreAdmin = getFirestore();
export const db = firestoreAdmin; // Alias for legacy code
export const storageAdmin = getStorage();
export const firebaseAdminAuth = admin.auth();

export default admin;
