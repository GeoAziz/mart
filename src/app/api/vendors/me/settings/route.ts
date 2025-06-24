
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest, type UserProfile } from '@/lib/authMiddleware';
import type { Timestamp } from 'firebase-admin/firestore';

export interface VendorSettings {
  storeName?: string;
  storeDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  bannerUrl?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  payoutMpesaNumber?: string;
  updatedAt?: Timestamp | Date;
}

const DEFAULT_VENDOR_SETTINGS: VendorSettings = {
  storeName: '',
  storeDescription: '',
  contactEmail: '',
  contactPhone: '',
  logoUrl: 'https://placehold.co/150x150/7777FF/FFFFFF?text=Logo',
  bannerUrl: 'https://placehold.co/600x200/77DDFF/FFFFFF?text=Banner',
  socialFacebook: '',
  socialTwitter: '',
  socialInstagram: '',
  payoutMpesaNumber: '',
};

// GET handler to fetch vendor settings
async function getVendorSettingsHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const vendorId = authenticatedUser.uid;

  try {
    const settingsDocRef = firestoreAdmin.collection('vendorSettings').doc(vendorId);
    const settingsDocSnap = await settingsDocRef.get();

    if (!settingsDocSnap.exists) {
      // Return default settings if none exist, but don't save them yet
      return NextResponse.json({ ...DEFAULT_VENDOR_SETTINGS, uid: vendorId }, { status: 200 });
    }

    const settingsData = settingsDocSnap.data() as VendorSettings;
    const responseData = {
        ...DEFAULT_VENDOR_SETTINGS, // Start with defaults to ensure all fields are present
        ...settingsData, // Override with actual saved data
        uid: vendorId,
        updatedAt: settingsData.updatedAt instanceof Timestamp ? settingsData.updatedAt.toDate() : new Date(settingsData.updatedAt || Date.now()),
    };
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error(`Error fetching settings for vendor ${vendorId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while fetching settings.' }, { status: 500 });
  }
}

export const GET = withAuth(getVendorSettingsHandler, ['vendor', 'admin']);

// PUT handler to update vendor settings
async function updateVendorSettingsHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const vendorId = authenticatedUser.uid;

  try {
    const body = await req.json() as Partial<VendorSettings>;

    // Basic validation (can be expanded with Zod)
    if (body.storeName !== undefined && (typeof body.storeName !== 'string' || body.storeName.trim().length === 0)) {
      return NextResponse.json({ message: 'Store name must be a non-empty string.' }, { status: 400 });
    }
    if (body.contactEmail !== undefined && (typeof body.contactEmail !== 'string' || !body.contactEmail.includes('@'))) {
         return NextResponse.json({ message: 'Invalid contact email format.' }, { status: 400 });
    }
    // Add more validations as needed

    const settingsDataToUpdate: Partial<VendorSettings> & { updatedAt: Date } = {
      ...body,
      updatedAt: new Date(), // Firestore will convert to Timestamp
    };

    const settingsDocRef = firestoreAdmin.collection('vendorSettings').doc(vendorId);
    // Use set with merge: true to create if not exists or update if exists
    await settingsDocRef.set(settingsDataToUpdate, { merge: true });

    const updatedSettingsSnap = await settingsDocRef.get();
    const updatedSettings = updatedSettingsSnap.data() as VendorSettings;
     const responseData = {
        ...DEFAULT_VENDOR_SETTINGS,
        ...updatedSettings,
        uid: vendorId,
        updatedAt: updatedSettings.updatedAt instanceof Timestamp ? updatedSettings.updatedAt.toDate() : new Date(updatedSettings.updatedAt || Date.now()),
    };


    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating settings for vendor ${vendorId}:`, error);
    if (error.type === 'entity.parse.failed') {
      return NextResponse.json({ message: 'Invalid JSON payload for settings update.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while updating settings.' }, { status: 500 });
  }
}

export const PUT = withAuth(updateVendorSettingsHandler, ['vendor', 'admin']);
    
