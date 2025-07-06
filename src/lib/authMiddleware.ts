import type { NextRequest, NextResponse } from 'next/server';
import firebaseAdminAuth, { firestoreAdmin } from './firebase-admin';
import type { UserRecord } from 'firebase-admin/auth';
import type { UserProfile, Role } from './types'; // Import from centralized types file

export interface AuthenticatedRequest extends NextRequest {
  user: UserRecord; // Firebase Admin SDK's UserRecord
  userProfile: UserProfile; // Your Firestore user profile
}

export type { UserProfile };

type ApiHandler = (req: AuthenticatedRequest, context: { params: any }) => Promise<NextResponse> | NextResponse;


export function withAuth(
  handler: ApiHandler,
  requiredRole?: Role | Role[]
) {
  return async (req: NextRequest, context: { params: any }): Promise<NextResponse> => {
    const { NextResponse } = await import('next/server');
    const authorization = req.headers.get('Authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized: No token provided or malformed.' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ message: 'Unauthorized: Token not found after Bearer.' }, { status: 401 });
    }

    try {
      // Use firebaseAdminAuth directly
      const { firebaseAdminAuth, firestoreAdmin } = await import('./firebase-admin');
      if (!firebaseAdminAuth) {
        return NextResponse.json({ message: 'Internal Server Error: Firebase Admin Auth not initialized.' }, { status: 500 });
      }
      const decodedToken = await firebaseAdminAuth.verifyIdToken(idToken);

      if (!firestoreAdmin) {
        return NextResponse.json({ message: 'Internal Server Error: Firestore Admin not initialized.' }, { status: 500 });
      }
      const userDocRef = firestoreAdmin.collection('users').doc(decodedToken.uid);
      const userDocSnap = await userDocRef.get();

      if (!userDocSnap.exists) {
        console.error(`User profile not found in Firestore for UID: ${decodedToken.uid}`);
        return NextResponse.json({ message: 'Forbidden: User account not fully set up.' }, { status: 403 });
      }

      const firestoreData = userDocSnap.data();
      const userProfile: UserProfile = {
        uid: decodedToken.uid,
        email: firestoreData?.email || decodedToken.email || null,
        fullName: firestoreData?.fullName || decodedToken.name || null,
        role: firestoreData?.role || 'customer',
        status: firestoreData?.status || 'active',
        createdAt: firestoreData?.createdAt,
        updatedAt: firestoreData?.updatedAt,
      };

      if (requiredRole) {
        const rolesToCheck = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!rolesToCheck.includes(userProfile.role)) {
          return NextResponse.json({ message: 'Forbidden: Insufficient permissions for this resource.' }, { status: 403 });
        }
      }

      // Fetch the full UserRecord from Firebase Admin
      const userRecord = await firebaseAdminAuth.getUser(decodedToken.uid);

      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = userRecord;
      authenticatedReq.userProfile = userProfile;

      return handler(authenticatedReq, context);
    } catch (error: any) {
      console.error('Authentication error:', error);
      let message = 'Internal Server Error during authentication.';
      let status = 500;

      if (error.code === 'auth/id-token-expired') {
        message = 'Unauthorized: Token expired.';
        status = 401;
      } else if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-revoked') {
        message = 'Unauthorized: Invalid token.';
        status = 401;
      }

      return NextResponse.json({ message }, { status });
    }
  };
}

// Legacy compatibility: export authMiddleware as a wrapper for withAuth
export const authMiddleware = withAuth(async (req, ctx) => {
  const { NextResponse } = await import('next/server');
  // Just return the user info for compatibility
  return NextResponse.json({ user: req.userProfile }, { status: 200 });
});
