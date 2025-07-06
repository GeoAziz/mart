/**
 * Auto-Complete Vendor Onboarding Script
 * -------------------------------------
 * This script automatically completes the onboarding process for all test vendors
 * by creating vendor profiles in Firestore with realistic business data.
 * 
 * This is for DEVELOPMENT/TESTING only - in production, vendors should complete
 * the onboarding form manually for compliance and verification.
 *
 * HOW TO RUN:
 * npm run vendor:onboard-auto
 */

import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';

interface VendorOnboardingData {
  userId: string;
  storeName: string;
  storeDescription: string;
  logoUrl?: string;
  bannerUrl?: string;
  businessType: 'individual' | 'company';
  businessRegNumber?: string;
  taxId?: string;
  phoneNumber: string;
  socialMedia: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  payoutSettings: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    mpesaNumber?: string;
  };
  isSetupComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Test vendor data based on your seed script
const testVendorsData = [
  {
    userId: 'vendor_user_id_1',
    email: 'vendor1@zilacart.com',
    storeName: 'TechHub Electronics',
    storeDescription: 'Leading electronics retailer in Kenya with latest gadgets, smartphones, laptops, and tech accessories. We offer genuine products with warranty and excellent customer service.',
    logoUrl: 'https://via.placeholder.com/200x200/2563eb/ffffff?text=TH',
    bannerUrl: 'https://via.placeholder.com/1200x300/2563eb/ffffff?text=TechHub+Electronics',
    businessType: 'company' as const,
    businessRegNumber: 'TECH001KE2024',
    taxId: 'TAX001234567',
    phoneNumber: '+254712345678',
    socialMedia: {
      facebook: 'facebook.com/techhubke',
      twitter: 'twitter.com/techhubke',
      instagram: 'instagram.com/techhubke'
    },
    payoutSettings: {
      bankName: 'KCB Bank',
      accountNumber: '1234567890123',
      accountHolderName: 'TechHub Electronics Ltd',
      mpesaNumber: '+254712345678'
    }
  },
  {
    userId: 'vendor_user_id_2',
    email: 'vendor2@zilacart.com',
    storeName: 'Fashion Forward',
    storeDescription: 'Trendy fashion boutique offering the latest styles in clothing, shoes, and accessories for men, women, and children. Quality fashion at affordable prices.',
    logoUrl: 'https://via.placeholder.com/200x200/ec4899/ffffff?text=FF',
    bannerUrl: 'https://via.placeholder.com/1200x300/ec4899/ffffff?text=Fashion+Forward',
    businessType: 'company' as const,
    businessRegNumber: 'FASH002KE2024',
    taxId: 'TAX002345678',
    phoneNumber: '+254723456789',
    socialMedia: {
      facebook: 'facebook.com/fashionforwardke',
      twitter: 'twitter.com/fashionforwardke',
      instagram: 'instagram.com/fashionforwardke'
    },
    payoutSettings: {
      bankName: 'Equity Bank',
      accountNumber: '2345678901234',
      accountHolderName: 'Fashion Forward Ltd',
      mpesaNumber: '+254723456789'
    }
  },
  {
    userId: 'vendor_user_id_3',
    email: 'vendor3@zilacart.com',
    storeName: 'Home & Garden Plus',
    storeDescription: 'Your one-stop shop for home improvement, kitchen appliances, furniture, and garden supplies. Transform your living space with our quality products.',
    logoUrl: 'https://via.placeholder.com/200x200/059669/ffffff?text=HG',
    bannerUrl: 'https://via.placeholder.com/1200x300/059669/ffffff?text=Home+Garden+Plus',
    businessType: 'individual' as const,
    businessRegNumber: 'HOME003KE2024',
    taxId: 'TAX003456789',
    phoneNumber: '+254734567890',
    socialMedia: {
      facebook: 'facebook.com/homegardenplus',
      twitter: 'twitter.com/homegardenplus',
      instagram: 'instagram.com/homegardenplus'
    },
    payoutSettings: {
      bankName: 'Co-operative Bank',
      accountNumber: '3456789012345',
      accountHolderName: 'John Kamau',
      mpesaNumber: '+254734567890'
    }
  },
  {
    userId: 'vendor_user_id_4',
    email: 'vendor4@zilacart.com',
    storeName: 'Sports & Outdoors',
    storeDescription: 'Premium sports equipment, outdoor gear, and fitness accessories for athletes and adventure enthusiasts. Gear up for your next challenge!',
    logoUrl: 'https://via.placeholder.com/200x200/dc2626/ffffff?text=SO',
    bannerUrl: 'https://via.placeholder.com/1200x300/dc2626/ffffff?text=Sports+Outdoors',
    businessType: 'company' as const,
    businessRegNumber: 'SPORT004KE2024',
    taxId: 'TAX004567890',
    phoneNumber: '+254745678901',
    socialMedia: {
      facebook: 'facebook.com/sportsoutdoorske',
      twitter: 'twitter.com/sportsoutdoorske',
      instagram: 'instagram.com/sportsoutdoorske'
    },
    payoutSettings: {
      bankName: 'Standard Chartered',
      accountNumber: '4567890123456',
      accountHolderName: 'Sports & Outdoors Ltd',
      mpesaNumber: '+254745678901'
    }
  }
];

async function checkVendorExists(userId: string): Promise<boolean> {
  try {
    if (!firestoreAdmin) {
      throw new Error('Firestore Admin is not initialized.');
    }
    const [vendorDoc, settingsDoc] = await Promise.all([
      firestoreAdmin.collection('vendors').doc(userId).get(),
      firestoreAdmin.collection('vendorSettings').doc(userId).get()
    ]);
    return vendorDoc.exists && settingsDoc.exists;
  } catch (error) {
    console.error(`Error checking vendor ${userId}:`, error);
    return false;
  }
}

// Update the createVendorProfile function
async function createVendorProfile(vendorData: typeof testVendorsData[0]): Promise<void> {
  if (!firestoreAdmin) {
    throw new Error('Firestore Admin is not initialized.');
  }
  // Vendor profile data
  const vendorProfileData = {
    userId: vendorData.userId,
    storeName: vendorData.storeName,
    storeDescription: vendorData.storeDescription,
    logoUrl: vendorData.logoUrl,
    bannerUrl: vendorData.bannerUrl,
    businessType: vendorData.businessType,
    businessRegNumber: vendorData.businessRegNumber,
    taxId: vendorData.taxId,
    phoneNumber: vendorData.phoneNumber,
    socialMedia: vendorData.socialMedia,
    payoutSettings: vendorData.payoutSettings,
    isSetupComplete: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Vendor settings data (required for vendor dashboard access)
  const vendorSettingsData = {
    storeName: vendorData.storeName,
    storeDescription: vendorData.storeDescription,
    contactEmail: vendorData.email,
    contactPhone: vendorData.phoneNumber,
    logoUrl: vendorData.logoUrl,
    bannerUrl: vendorData.bannerUrl,
    socialFacebook: vendorData.socialMedia.facebook,
    socialTwitter: vendorData.socialMedia.twitter,
    socialInstagram: vendorData.socialMedia.instagram,
    payoutMpesaNumber: vendorData.payoutSettings.mpesaNumber,
    businessType: vendorData.businessType,
    businessRegNumber: vendorData.businessRegNumber,
    taxId: vendorData.taxId,
    isSetupComplete: true,
    onboardingIncomplete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Save both documents
  await Promise.all([
    firestoreAdmin.collection('vendors').doc(vendorData.userId).set(vendorProfileData),
    firestoreAdmin.collection('vendorSettings').doc(vendorData.userId).set(vendorSettingsData)
  ]);

  console.log(`✅ Created vendor profile and settings for: ${vendorData.storeName} (${vendorData.email})`);
}

async function autoCompleteVendorOnboarding(): Promise<void> {
  console.log('🚀 Starting Auto-Complete Vendor Onboarding...\n');

  if (!firestoreAdmin) {
    throw new Error('Firestore Admin is not initialized. Check your Firebase configuration.');
  }

  let completedCount = 0;
  let skippedCount = 0;

  for (const vendorData of testVendorsData) {
    try {
      console.log(`🔍 Checking vendor: ${vendorData.email}...`);
      
      const exists = await checkVendorExists(vendorData.userId);
      
      if (exists) {
        console.log(`⏭️  Vendor profile and settings already exist for: ${vendorData.storeName}`);
        skippedCount++;
        continue;
      }

      await createVendorProfile(vendorData);
      completedCount++;
      
    } catch (error) {
      console.error(`❌ Error processing vendor ${vendorData.email}:`, error);
    }
  }

  console.log('\n🎯 Auto-Complete Vendor Onboarding Summary:');
  console.log(`✅ Completed: ${completedCount} vendor profiles`);
  console.log(`⏭️  Skipped: ${skippedCount} existing profiles`);
  console.log(`📊 Total: ${testVendorsData.length} vendors processed\n`);

  if (completedCount > 0) {
    console.log('🎉 Vendor onboarding auto-completion successful!');
    console.log('\n📋 Test Vendor Credentials:');
    testVendorsData.forEach(vendor => {
      console.log(`   📧 ${vendor.email} | 🔑 password123 | 🏪 ${vendor.storeName}`);
    });
    console.log('\n✨ All test vendors can now access their dashboards directly!\n');
  } else {
    console.log('ℹ️  No new vendor profiles were created (all already exist).\n');
  }
}

async function main() {
  try {
    await autoCompleteVendorOnboarding();
    console.log('🚀 Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();