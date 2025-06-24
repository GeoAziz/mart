
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest, type UserProfile } from '@/lib/authMiddleware';
import type { Timestamp } from 'firebase-admin/firestore';

async function listUsersHandler(req: AuthenticatedRequest) {
  // The withAuth middleware already restricts this to 'admin'
  try {
    const usersSnapshot = await firestoreAdmin.collection('users').orderBy('createdAt', 'desc').get();
    const users: UserProfile[] = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email || null,
        fullName: data.fullName || null,
        role: data.role || 'customer',
        status: data.status || 'active',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
      };
    });
    return NextResponse.json(users, { status: 200 });
  } catch (error: any) {
    console.error('Error listing users:', error);
    return NextResponse.json({ message: 'Internal Server Error while listing users.' }, { status: 500 });
  }
}

// Restrict this route to admin users only
export const GET = withAuth(listUsersHandler, 'admin');
