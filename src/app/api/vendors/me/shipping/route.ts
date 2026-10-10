import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { requireVendor } from '@/lib/authorization';

async function getShippingSettingsHandler(req: AuthenticatedRequest) {
  const vendorId = req.userProfile.uid;

  try {
    requireVendor(req.userProfile);

    const doc = await firestoreAdmin.collection('vendors').doc(vendorId).collection('settings').doc('shipping').get();
    
    if (!doc.exists) {
      return NextResponse.json({
        enabled: true,
        freeShippingThreshold: 5000,
        zones: [],
        defaultZone: '',
        returnAddress: {
          name: '', street: '', city: '', state: '', postalCode: '', country: '', phone: '',
        }
      });
    }

    return NextResponse.json(doc.data());
  } catch (error: any) {
    console.error('Error fetching shipping settings:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

async function updateShippingSettingsHandler(req: AuthenticatedRequest) {
  const vendorId = req.userProfile.uid;

  try {
    requireVendor(req.userProfile);
    const data = await req.json();

    await firestoreAdmin.collection('vendors').doc(vendorId).collection('settings').doc('shipping').set(data, { merge: true });

    return NextResponse.json({ message: 'Settings saved' });
  } catch (error: any) {
    console.error('Error saving shipping settings:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withAuth(getShippingSettingsHandler, ['vendor', 'admin']);
export const POST = withAuth(updateShippingSettingsHandler, ['vendor', 'admin']);

