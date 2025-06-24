
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest, type UserProfile } from '@/lib/authMiddleware';
import type { Timestamp } from 'firebase-admin/firestore';

async function requestVendorStatusHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const targetUid = authenticatedUser.uid;

  try {
    const userDocRef = firestoreAdmin.collection('users').doc(targetUid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      // This should ideally not happen if withAuth middleware works correctly
      return NextResponse.json({ message: 'User profile not found.' }, { status: 404 });
    }

    const currentUserData = userDocSnap.data() as UserProfile;

    if (currentUserData.role !== 'customer') {
      return NextResponse.json({ message: `Cannot request vendor status. Current role: ${currentUserData.role}.` }, { status: 400 });
    }

    if (currentUserData.status === 'pending_approval') {
      return NextResponse.json({ message: 'Vendor status request is already pending approval.' }, { status: 400 });
    }
    
    if (currentUserData.status !== 'active') {
        return NextResponse.json({ message: `Cannot request vendor status. Current status: ${currentUserData.status}. Account must be active.` }, { status: 400 });
    }


    const updateData = {
      status: 'pending_approval',
      updatedAt: new Date(), // Firestore will convert this to Timestamp
    };

    await userDocRef.update(updateData);

    const updatedUserDocSnap = await userDocRef.get();
    const updatedUserProfileData = updatedUserDocSnap.data();

     const responseProfile: UserProfile = {
      uid: updatedUserDocSnap.id,
      email: updatedUserProfileData?.email || null,
      fullName: updatedUserProfileData?.fullName || null,
      role: updatedUserProfileData?.role || 'customer',
      status: updatedUserProfileData?.status || 'active',
      createdAt: updatedUserProfileData?.createdAt instanceof Timestamp ? updatedUserProfileData.createdAt.toDate() : new Date(updatedUserProfileData?.createdAt),
      updatedAt: updatedUserProfileData?.updatedAt instanceof Timestamp ? updatedUserProfileData.updatedAt.toDate() : (updatedUserProfileData?.updatedAt ? new Date(updatedUserProfileData.updatedAt) : undefined),
    };

    return NextResponse.json(responseProfile, { status: 200 });

  } catch (error: any) {
    console.error(`Error requesting vendor status for user ${targetUid}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while requesting vendor status.' }, { status: 500 });
  }
}

export const POST = withAuth(requestVendorStatusHandler); // Any authenticated user can call this
