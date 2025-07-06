import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { VendorProfile } from '@/lib/types';

// GET handler for fetching shipping settings
async function getShippingSettingsHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile as VendorProfile;
  
  if (authenticatedUser.role !== 'vendor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const settingsDoc = await firestoreAdmin
      .collection('vendors')
      .doc(authenticatedUser.uid)
      .collection('settings')
      .doc('shipping')
      .get();

    if (!settingsDoc.exists) {
      // Return default settings if none exist
      return NextResponse.json({
        enabled: true,
        freeShippingThreshold: 5000,
        zones: [],
        defaultZone: '',
        returnAddress: {
          name: authenticatedUser.storeName || '',
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'Kenya',
          phone: authenticatedUser.contactPhone || '',
        },
      });
    }

    return NextResponse.json(settingsDoc.data());
  } catch (error: any) {
    console.error('Error fetching shipping settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipping settings' },
      { status: 500 }
    );
  }
}

// POST handler for updating shipping settings
async function updateShippingSettingsHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile as VendorProfile;
  
  if (authenticatedUser.role !== 'vendor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const settings = await req.json();

    // Basic validation
    if (typeof settings.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      );
    }

    // Update settings
    await firestoreAdmin
      .collection('vendors')
      .doc(authenticatedUser.uid)
      .collection('settings')
      .doc('shipping')
      .set(settings, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating shipping settings:', error);
    return NextResponse.json(
      { error: 'Failed to update shipping settings' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getShippingSettingsHandler);
export const POST = withAuth(updateShippingSettingsHandler);
