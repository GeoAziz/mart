
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin, firebaseAdminAuth } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { UserProfile, Role } from '@/lib/types';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';

const createUserSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  role: z.enum(['customer', 'vendor', 'admin']),
  status: z.enum(['active', 'pending_approval', 'suspended']),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

async function adminCreateUserHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ message: "Validation failed", errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, password, fullName, role, status } = validationResult.data;

    // Create user in Firebase Authentication
    const userRecord = await firebaseAdminAuth.createUser({
      email,
      password,
      displayName: fullName,
      emailVerified: true, // Or false, depending on desired flow
    });

    // Create user profile in Firestore
    const userDocRef = firestoreAdmin.collection('users').doc(userRecord.uid);
    const now = new Date();
    const userProfileData: UserProfile = {
      uid: userRecord.uid,
      email,
      fullName,
      role,
      status,
      createdAt: now, // Firestore will convert to Timestamp
      updatedAt: now, // Firestore will convert to Timestamp
    };

    await userDocRef.set(userProfileData);
    
    // Convert Firestore timestamps to Date for the response
    const responseProfile: UserProfile = {
        ...userProfileData,
        createdAt: userProfileData.createdAt instanceof Timestamp ? userProfileData.createdAt.toDate() : new Date(userProfileData.createdAt),
        updatedAt: userProfileData.updatedAt instanceof Timestamp ? userProfileData.updatedAt.toDate() : (userProfileData.updatedAt ? new Date(userProfileData.updatedAt) : undefined),
    };


    return NextResponse.json(responseProfile, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user by admin:', error);
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ message: 'Email address is already in use by another account.' }, { status: 409 });
    }
    if (error.type === 'entity.parse.failed' || error.name === 'SyntaxError') {
      return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while creating user.' }, { status: 500 });
  }
}

export const POST = withAuth(adminCreateUserHandler, 'admin');
