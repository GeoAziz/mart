
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { Timestamp } from 'firebase-admin/firestore';

// Re-defining interfaces here to match potential Firestore structure (e.g. Timestamps)
// Ideally, these would be shared types if more complex or used across many places.

interface HeroSlide {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  dataAiHint?: string;
  link: string;
  buttonText: string;
}

interface FeaturedItem {
  id: string;
  type: 'product' | 'category' | 'vendor';
  itemId: string;
  displayName: string;
  imageUrl?: string;
  dataAiHint?: string;
}

interface PromoBanner {
  id: string;
  name: string;
  imageUrl: string;
  dataAiHint?: string;
  link: string;
  isActive: boolean;
  displayArea: 'homepage_top' | 'sidebar' | 'category_page';
}

interface HomepageCmsData {
  heroSlides: HeroSlide[];
  featuredItems: FeaturedItem[];
  promoBanners: PromoBanner[];
  updatedAt?: Timestamp | Date; // Stored as Timestamp, converted to Date for client
}

const CMS_COLLECTION = 'cms';
const HOMEPAGE_DOC_ID = 'homepage_content';

const DEFAULT_HOMEPAGE_DATA: Omit<HomepageCmsData, 'updatedAt'> = {
    heroSlides: [
        { id: 'slide1-default', title: "Welcome to ZilaCart", description: "Your adventure in futuristic shopping begins here.", imageUrl: "https://placehold.co/1200x600/2A0B3D/E0E0E0?text=ZilaCart+Welcome", dataAiHint: "welcome banner", link: "/products", buttonText: "Shop Now" },
    ],
    featuredItems: [],
    promoBanners: [],
};

// PUBLIC GET handler to fetch homepage CMS data
export async function GET(req: NextRequest) {
  // Add a specific check to see if the Firebase Admin SDK was initialized correctly.
  if (!firestoreAdmin) {
    console.error("CRITICAL: Firestore Admin SDK is not initialized. This is likely due to missing or incorrect server-side environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).");
    return NextResponse.json({ message: 'Internal Server Error: The server is not configured correctly to connect to the database. Please check the server logs for more details.' }, { status: 500 });
  }

  try {
    const docRef = firestoreAdmin.collection(CMS_COLLECTION).doc(HOMEPAGE_DOC_ID);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      // If no data, return default structure (don't save defaults yet)
      return NextResponse.json({ ...DEFAULT_HOMEPAGE_DATA, updatedAt: new Date() }, { status: 200 });
    }

    const data = docSnap.data() as HomepageCmsData;
    // Convert Firestore Timestamp to Date for client if necessary
    const responseData = {
        ...data,
        heroSlides: data.heroSlides || [],
        featuredItems: data.featuredItems || [],
        promoBanners: data.promoBanners || [],
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching homepage CMS data:', error);
    return NextResponse.json({ message: 'Internal Server Error while fetching CMS data.' }, { status: 500 });
  }
}


// ADMIN-ONLY PUT handler to save/update homepage CMS data
async function updateHomepageCmsHandler(req: AuthenticatedRequest) {
   if (!firestoreAdmin) {
    console.error("CRITICAL: Firestore Admin SDK is not initialized. Cannot update CMS data.");
    return NextResponse.json({ message: 'Internal Server Error: The server is not configured correctly to connect to the database.' }, { status: 500 });
  }
  try {
    const body = await req.json() as Omit<HomepageCmsData, 'updatedAt'>;

    // Basic validation (can be expanded with Zod)
    if (!body || !Array.isArray(body.heroSlides) || !Array.isArray(body.featuredItems) || !Array.isArray(body.promoBanners)) {
      return NextResponse.json({ message: 'Invalid CMS data payload. Required arrays are missing.' }, { status: 400 });
    }

    const dataToSave: HomepageCmsData = {
      ...body,
      updatedAt: new Date(), // Firestore will convert to Timestamp
    };

    const docRef = firestoreAdmin.collection(CMS_COLLECTION).doc(HOMEPAGE_DOC_ID);
    await docRef.set(dataToSave, { merge: true }); // Use merge: true to be safe, or just set to overwrite

    // Return the saved data, converting timestamp for client consistency
    const responseData = {
        ...dataToSave,
        updatedAt: dataToSave.updatedAt instanceof Timestamp ? dataToSave.updatedAt.toDate() : new Date(dataToSave.updatedAt || Date.now()),
    };
    
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error('Error updating homepage CMS data:', error);
    if (error.type === 'entity.parse.failed' || error.message.includes('JSON')) {
      return NextResponse.json({ message: 'Invalid JSON payload for CMS update.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while updating CMS data.' }, { status: 500 });
  }
}

export const PUT = withAuth(updateHomepageCmsHandler, 'admin');
