import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { requireVendor } from '@/lib/authorization';

async function verifyPayoutHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const vendorId = authenticatedUser.uid;

  try {
    requireVendor(authenticatedUser || req.userProfile);
    
    const body = await req.json();
    const { otp } = body;

    // Simulate OTP verification
    if (!otp || otp.length !== 6) {
      return NextResponse.json({ message: 'Invalid OTP format. Must be 6 digits.' }, { status: 400 });
    }
    
    // In a real app, verify OTP here
    if (otp !== '123456') {
       return NextResponse.json({ message: 'Incorrect OTP.' }, { status: 400 });
    }

    if (!firestoreAdmin) {
      return NextResponse.json({ message: 'Firestore admin is not initialized.' }, { status: 500 });
    }

    const settingsDocRef = firestoreAdmin.collection('vendorSettings').doc(vendorId);
    
    // Check if M-Pesa number is set
    const currentSettingsSnap = await settingsDocRef.get();
    if (!currentSettingsSnap.exists) {
        return NextResponse.json({ message: 'Settings not found.' }, { status: 404 });
    }
    
    const currentSettings = currentSettingsSnap.data();
    if (!currentSettings?.payoutMpesaNumber) {
        return NextResponse.json({ message: 'No M-Pesa number found to verify.' }, { status: 400 });
    }

    // Use set with merge: true to update
    await settingsDocRef.set({
      payoutMpesaVerified: true,
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({ message: 'Payout details verified successfully.', verified: true }, { status: 200 });

  } catch (error: any) {
    console.error(`Error verifying payout settings for vendor ${vendorId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while verifying settings.' }, { status: 500 });
  }
}

export const POST = withAuth(verifyPayoutHandler, ['vendor', 'admin']);

