
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage, type Storage as AdminStorage } from 'firebase-admin/storage';

// Check if the required environment variables for the service account are set.
const hasServiceAccountEnvVars = 
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;


let serviceAccount: ServiceAccount | undefined = undefined;

if (hasServiceAccountEnvVars) {
  // This block runs on Vercel/production where env vars are set
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Vercel escapes newlines in multiline env vars, so we need to replace them back
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  } as ServiceAccount;
} else {
  // This block runs for local development, falling back to the JSON file
  try {
    // Use absolute path to avoid module resolution issues in Next.js
    // __dirname points to the directory of this file (src/lib)
    // serviceaccountkey.json is in the project root (mart/serviceaccountkey.json)
    // So, resolve the path relative to the project root
    // This works for both dev and build (server) environments
    // Use fs.readFileSync to avoid require cache issues and support .json import restrictions
    const path = require('path');
    const fs = require('fs');
    const keyPath = path.resolve(process.cwd(), 'serviceaccountkey.json');
    if (fs.existsSync(keyPath)) {
      const file = fs.readFileSync(keyPath, 'utf8');
      serviceAccount = JSON.parse(file);
    } else {
      throw new Error('serviceaccountkey.json not found at project root');
    }
  } catch (error) {
    console.warn("--------------------------------------------------------------------------------");
    console.warn("### WARNING: Admin credentials not found via env vars or local file. ###");
    console.warn("Server-side Firebase functionality (API routes) will likely fail.");
    console.warn("For production (Vercel), set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.");
    console.warn("For local dev, ensure 'serviceaccountkey.json' is in the project root.");
    console.warn("--------------------------------------------------------------------------------");
  }
}

let firebaseAdminAuth: Auth | undefined = undefined;
let firestoreAdmin: Firestore | undefined = undefined;
let storageAdmin: AdminStorage | undefined = undefined;


// Initialize the app only if it hasn't been initialized and we have credentials
if (!admin.apps.length && serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: serviceAccount.projectId ? `${serviceAccount.projectId}.appspot.com` : undefined
    });
  } catch (error: any) {
    if (error.code !== 'app/duplicate-app') {
      console.error("Firebase Admin SDK initialization error:", error.message);
    }
  }
}

// Only assign services if the app is initialized and serviceAccount is defined
if (admin.apps.length > 0 && serviceAccount) {
  try {
    firebaseAdminAuth = getAuth();
    firestoreAdmin = getFirestore();
    storageAdmin = getAdminStorage();
  } catch (e) {
    console.error("Failed to get Firebase Admin services. The service account might be missing or invalid.");
    firebaseAdminAuth = undefined;
    firestoreAdmin = undefined;
    storageAdmin = undefined;
  }
} else {
  firebaseAdminAuth = undefined;
  firestoreAdmin = undefined;
  storageAdmin = undefined;
}

export { firebaseAdminAuth, firestoreAdmin, storageAdmin };
export default admin;
