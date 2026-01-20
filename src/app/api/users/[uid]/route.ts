
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin, firebaseAdminAuth } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { UserProfile } from '@/lib/types';
import type { Timestamp } from 'firebase-admin/firestore';


type UpdateProfileData = {
  fullName?: string;
  role?: 'customer' | 'vendor' | 'admin';
  status?: 'active' | 'pending_approval' | 'suspended';
};

async function updateUserProfile(req: AuthenticatedRequest, context: { params: Promise<{ uid: string }> }) {
  const targetUid = (await context.params).uid;
  const authenticatedUser = req.userProfile;

  if (!targetUid) {
    return NextResponse.json({ message: 'User UID is missing in the request path.' }, { status: 400 });
  }

  try {
    const body = await req.json() as UpdateProfileData;
    const dataToUpdate: Partial<UserProfile> & { updatedAt?: Date } = {};

    // Only allow self-update for fullName, or admin update for all fields
    if (authenticatedUser.uid === targetUid) {
      if (body.fullName !== undefined) {
        if (typeof body.fullName !== 'string' || body.fullName.trim().length < 2) {
          return NextResponse.json({ message: 'Invalid full name. Must be a string with at least 2 characters.' }, { status: 400 });
        }
        dataToUpdate.fullName = body.fullName.trim();
      }
      if (body.role !== undefined && body.role !== authenticatedUser.role) {
         return NextResponse.json({ message: 'Forbidden: You cannot change your own role.' }, { status: 403 });
      }
      if (body.status !== undefined && body.status !== authenticatedUser.status) {
         return NextResponse.json({ message: 'Forbidden: You cannot change your own status directly through this endpoint.' }, { status: 403 });
      }
    } else if (authenticatedUser.role === 'admin') {
      // Admin can update fullName, role, and status
      if (body.fullName !== undefined) {
        if (typeof body.fullName !== 'string' || body.fullName.trim().length < 2) {
          return NextResponse.json({ message: 'Invalid full name. Must be a string with at least 2 characters.' }, { status: 400 });
        }
        dataToUpdate.fullName = body.fullName.trim();
      }

      if (body.role !== undefined) {
        if (!['customer', 'vendor', 'admin'].includes(body.role)) {
          return NextResponse.json({ message: 'Invalid role specified.' }, { status: 400 });
        }
        dataToUpdate.role = body.role;
        // If an admin promotes to 'vendor', ensure status is 'active'
        if (body.role === 'vendor') {
          dataToUpdate.status = 'active';
        }
      }

      if (body.status !== undefined) {
        if (!['active', 'pending_approval', 'suspended'].includes(body.status)) {
          return NextResponse.json({ message: 'Invalid status specified.' }, { status: 400 });
        }
        // If role is not being changed to vendor, or role is not changing at all, allow direct status update by admin
        if (dataToUpdate.role !== 'vendor') { 
          dataToUpdate.status = body.status;
        } else if (!body.role) { // if role is not in body, means it's not changing, so status can be set.
            dataToUpdate.status = body.status;
        }
        // If role is being set to vendor, status is already forced to 'active' above, so an explicit status for vendor approval isn't needed here.
      }
    } else {
      // Not self and not admin
      return NextResponse.json({ message: 'Forbidden: You do not have permission to update this user profile.' }, { status: 403 });
    }
    
    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update.' }, { status: 400 });
    }

    const userDocRef = firestoreAdmin.collection('users').doc(targetUid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      return NextResponse.json({ message: 'User profile not found.' }, { status: 404 });
    }

    dataToUpdate.updatedAt = new Date(); // Firestore will convert this to Timestamp

    await userDocRef.update(dataToUpdate);

    const updatedUserDocSnap = await userDocRef.get();
    const updatedUserProfileData = updatedUserDocSnap.data();

    const responseProfile: UserProfile = {
      uid: updatedUserDocSnap.id,
      email: updatedUserProfileData?.email || null,
      fullName: updatedUserProfileData?.fullName || null,
      role: updatedUserProfileData?.role || 'customer',
      status: updatedUserProfileData?.status || 'active',
      createdAt: updatedUserProfileData?.createdAt?.toDate ? updatedUserProfileData.createdAt.toDate() : new Date(updatedUserProfileData?.createdAt || Date.now()),
      updatedAt: updatedUserProfileData?.updatedAt?.toDate ? updatedUserProfileData.updatedAt.toDate() : (updatedUserProfileData?.updatedAt ? new Date(updatedUserProfileData.updatedAt) : undefined),
    };

    return NextResponse.json(responseProfile, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating user profile for ${targetUid}:`, error);
    if (error.type === 'entity.parse.failed' || error.name === 'SyntaxError') {
      return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while updating user profile.' }, { status: 500 });
  }
}

export const PUT = withAuth(updateUserProfile); // No specific role, handled inside

async function getUserProfile(req: AuthenticatedRequest, context: { params: Promise<{ uid: string }> }) {
  const targetUid = (await context.params).uid;
  const authenticatedUser = req.userProfile;

  if (!targetUid) {
    return NextResponse.json({ message: 'User UID is missing.' }, { status: 400 });
  }

  if (authenticatedUser.uid !== targetUid && authenticatedUser.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden: You do not have permission to view this user profile.' }, { status: 403 });
  }

  try {
    const userDocRef = firestoreAdmin.collection('users').doc(targetUid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      return NextResponse.json({ message: 'User profile not found.' }, { status: 404 });
    }

    const profileData = userDocSnap.data();
    const userProfileResponse: UserProfile = {
        uid: userDocSnap.id,
        email: profileData?.email || null,
        fullName: profileData?.fullName || null,
        role: profileData?.role || 'customer',
        status: profileData?.status || 'active',
        createdAt: profileData?.createdAt?.toDate ? profileData.createdAt.toDate() : new Date(profileData?.createdAt || Date.now()),
        updatedAt: profileData?.updatedAt?.toDate ? profileData.updatedAt.toDate() : (profileData?.updatedAt ? new Date(profileData.updatedAt) : undefined),
    };

    return NextResponse.json(userProfileResponse, { status: 200 });

  } catch (error: any) {
    console.error(`Error fetching user profile for ${targetUid}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while fetching user profile.' }, { status: 500 });
  }
}

export const GET = withAuth(getUserProfile);


async function deleteUserHandler(req: AuthenticatedRequest, context: { params: Promise<{ uid: string }> }) {
  const targetUid = (await context.params).uid;
  const authenticatedUser = req.userProfile; // This is the admin performing the action

  if (!targetUid) {
    return NextResponse.json({ message: 'User UID is missing.' }, { status: 400 });
  }

  // Safety check: Admin cannot delete themselves using this endpoint
  if (authenticatedUser.uid === targetUid) {
    return NextResponse.json({ message: 'Forbidden: Admins cannot delete their own account through this endpoint.' }, { status: 403 });
  }

  try {
    const userDocRef = firestoreAdmin.collection('users').doc(targetUid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      // If Firestore profile doesn't exist, still try to delete from Auth if an account might exist there
      try {
        await firebaseAdminAuth.deleteUser(targetUid);
        return NextResponse.json({ message: 'User deleted from Authentication. Firestore profile was not found.' }, { status: 200 });
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
           return NextResponse.json({ message: 'User not found in Authentication or Firestore.' }, { status: 404 });
        }
        console.error(`Error deleting user ${targetUid} from Firebase Auth:`, authError);
        return NextResponse.json({ message: 'Error during user deletion from Authentication.' }, { status: 500 });
      }
    }
    
    const targetUserProfile = userDocSnap.data() as UserProfile;

    // Safety check: Prevent an admin from deleting another admin
    if (targetUserProfile.role === 'admin') {
        return NextResponse.json({ message: 'Forbidden: Cannot delete another admin account.' }, { status: 403 });
    }

    // Delete from Firebase Authentication
    await firebaseAdminAuth.deleteUser(targetUid);
    
    // Delete from Firestore
    await userDocRef.delete();

    return NextResponse.json({ message: `User ${targetUid} deleted successfully from Authentication and Firestore.` }, { status: 200 });

  } catch (error: any) {
    console.error(`Error deleting user ${targetUid}:`, error);
     if (error.code === 'auth/user-not-found') { // If user was already deleted from Auth but not Firestore
        try {
            await firestoreAdmin.collection('users').doc(targetUid).delete();
            return NextResponse.json({ message: 'User profile deleted from Firestore. Auth record not found.' }, { status: 200 });
        } catch (fsError) {
            console.error(`Error deleting orphan Firestore profile for ${targetUid}:`, fsError);
             return NextResponse.json({ message: 'Error deleting orphan Firestore profile.' }, { status: 500 });
        }
    }
    return NextResponse.json({ message: 'Internal Server Error while deleting user.' }, { status: 500 });
  }
}

export const DELETE = withAuth(deleteUserHandler, 'admin');
