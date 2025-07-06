
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Check if all required keys are present
export const isFirebaseConfigured = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
);

let app: FirebaseApp;
let authClient: Auth;
let db: Firestore;
let analytics: Analytics | undefined;

if (isFirebaseConfigured) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    
    authClient = getAuth(app);
    db = getFirestore(app);

    // Only initialize analytics in production and on client side
    if (typeof window !== 'undefined') {
      try {
        analytics = getAnalytics(app);
        console.log('Analytics initialized successfully');
      } catch (error) {
        console.warn('Analytics initialization failed:', error);
        analytics = undefined;
      }
    }
} else {
    console.warn("Firebase is not configured.");
    app = {} as FirebaseApp;
    authClient = {} as Auth;
    db = {} as Firestore;
}


export { app, authClient, db, analytics };
