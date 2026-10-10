import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import type { VendorSettings } from '@/lib/types';

// Public-safe subset of VendorSettings for the storefront.
// Private fields (payoutMpesaNumber, auto-reply config, etc.) are never exposed.
export interface PublicVendorSettings {
  storeName: string;
  storeDescription: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string;
  bannerUrl: string;
  socialFacebook: string;
  socialTwitter: string;
  socialInstagram: string;
}

const DEFAULT_PUBLIC_SETTINGS: PublicVendorSettings = {
  storeName: '',
  storeDescription: '',
  contactEmail: '',
  contactPhone: '',
  logoUrl: 'https://placehold.co/150x150/7777FF/FFFFFF?text=Logo',
  bannerUrl: 'https://placehold.co/600x200/77DDFF/FFFFFF?text=Banner',
  socialFacebook: '',
  socialTwitter: '',
  socialInstagram: '',
};

// GET /api/vendors/[vendorId]/settings — public, read-only storefront settings.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const { vendorId } = await params;

  if (!vendorId) {
    return NextResponse.json({ message: 'Vendor ID is required.' }, { status: 400 });
  }

  // Graceful degradation: if Firestore isn't configured, return defaults.
  if (!firestoreAdmin) {
    return NextResponse.json(DEFAULT_PUBLIC_SETTINGS, { status: 200 });
  }

  try {
    const settingsDoc = await firestoreAdmin
      .collection('vendorSettings')
      .doc(vendorId)
      .get();

    if (!settingsDoc.exists) {
      return NextResponse.json(DEFAULT_PUBLIC_SETTINGS, { status: 200 });
    }

    const data = settingsDoc.data() as VendorSettings;

    // Whitelist only public-safe fields.
    return NextResponse.json({
      storeName: data.storeName || DEFAULT_PUBLIC_SETTINGS.storeName,
      storeDescription: data.storeDescription || DEFAULT_PUBLIC_SETTINGS.storeDescription,
      contactEmail: data.contactEmail || DEFAULT_PUBLIC_SETTINGS.contactEmail,
      contactPhone: data.contactPhone || DEFAULT_PUBLIC_SETTINGS.contactPhone,
      logoUrl: data.logoUrl || DEFAULT_PUBLIC_SETTINGS.logoUrl,
      bannerUrl: data.bannerUrl || DEFAULT_PUBLIC_SETTINGS.bannerUrl,
      socialFacebook: data.socialFacebook || DEFAULT_PUBLIC_SETTINGS.socialFacebook,
      socialTwitter: data.socialTwitter || DEFAULT_PUBLIC_SETTINGS.socialTwitter,
      socialInstagram: data.socialInstagram || DEFAULT_PUBLIC_SETTINGS.socialInstagram,
    } satisfies PublicVendorSettings, { status: 200 });
  } catch (error) {
    console.error(`Error fetching public settings for vendor ${vendorId}:`, error);
    // Graceful degradation: storefront still renders with defaults.
    return NextResponse.json(DEFAULT_PUBLIC_SETTINGS, { status: 200 });
  }
}
