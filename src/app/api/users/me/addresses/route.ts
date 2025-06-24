
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { z } from 'zod';
import type { Timestamp } from 'firebase-admin/firestore';

// This interface is what the API returns to the client.
// Timestamps should be JS Date objects. isDefault should be a boolean.
export interface Address {
  id: string;
  label: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode?: string;
  phone: string;
  isDefault: boolean; // No longer optional, defaults to false
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = z.object({
  label: z.string().min(1, "Label is required."),
  fullName: z.string().min(2, "Full name is required."),
  addressLine1: z.string().min(5, "Address line 1 is required."),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required."),
  postalCode: z.string().optional(),
  phone: z.string().min(10, "A valid phone number is required."),
  isDefault: z.boolean().optional(), // isDefault is optional in input, but not output
});

// Helper to safely convert Firestore data to our Address type for client
function mapFirestoreDocToAddress(doc: FirebaseFirestore.DocumentSnapshot): Address {
  const data = doc.data();
  if (!data) {
    // This case should ideally not be reached if the document exists
    console.error(`Address document ${doc.id} has no data.`);
    throw new Error(`Address document ${doc.id} is missing data.`);
  }

  const createdAt = data.createdAt;
  const updatedAt = data.updatedAt;

  return {
    id: doc.id,
    label: data.label || 'N/A', // Provide default if field is missing
    fullName: data.fullName || 'N/A',
    addressLine1: data.addressLine1 || 'N/A',
    addressLine2: data.addressLine2,
    city: data.city || 'N/A',
    postalCode: data.postalCode,
    phone: data.phone || 'N/A',
    isDefault: data.isDefault || false, // Ensure boolean, default to false
    createdAt: createdAt?.toDate ? createdAt.toDate() : (createdAt ? new Date(createdAt) : new Date()),
    updatedAt: updatedAt?.toDate ? updatedAt.toDate() : (updatedAt ? new Date(updatedAt) : new Date()),
  };
}


// GET handler to fetch all addresses for the authenticated user
async function getAddressesHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  try {
    const addressesSnapshot = await firestoreAdmin
      .collection('users')
      .doc(authenticatedUser.uid)
      .collection('addresses')
      // .orderBy('isDefault', 'desc') // Removed to avoid composite index error
      // .orderBy('createdAt', 'asc')
      .get();

    let addresses: Address[] = addressesSnapshot.docs.map(mapFirestoreDocToAddress);

    // Perform sorting in-memory
    addresses.sort((a, b) => {
        // Sort by isDefault descending (true comes first)
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;

        // Then sort by createdAt ascending (older comes first)
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return timeA - timeB;
    });

    return NextResponse.json(addresses, { status: 200 });
  } catch (error: any) {
    console.error(`Error fetching addresses for user ${authenticatedUser.uid}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while fetching addresses.' }, { status: 500 });
  }
}
export const GET = withAuth(getAddressesHandler);

// POST handler to add a new address for the authenticated user
async function addAddressHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  try {
    const body = await req.json();
    const validationResult = addressSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ message: "Validation failed", errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const newAddressData = validationResult.data;
    const now = new Date();

    const newAddressDocRef = firestoreAdmin.collection('users').doc(authenticatedUser.uid).collection('addresses').doc();
    
    await firestoreAdmin.runTransaction(async (transaction) => {
        const addressToCreate = {
            ...newAddressData,
            isDefault: newAddressData.isDefault || false, // Ensure isDefault is always a boolean
            createdAt: now, // Firestore will convert to Timestamp
            updatedAt: now, // Firestore will convert to Timestamp
        };

        if (addressToCreate.isDefault) {
            const currentDefaultQuery = firestoreAdmin
            .collection('users')
            .doc(authenticatedUser.uid)
            .collection('addresses')
            .where('isDefault', '==', true);
            
            const currentDefaultSnapshot = await transaction.get(currentDefaultQuery);
            currentDefaultSnapshot.forEach(doc => {
                transaction.update(doc.ref, { isDefault: false, updatedAt: now });
            });
        }
        transaction.set(newAddressDocRef, addressToCreate);
    });

    const createdAddressSnap = await newAddressDocRef.get();
    if (!createdAddressSnap.exists) { // Should not happen
        throw new Error("Failed to retrieve newly created address.");
    }
    const createdAddressResponse = mapFirestoreDocToAddress(createdAddressSnap);

    return NextResponse.json(createdAddressResponse, { status: 201 });

  } catch (error: any) {
    console.error(`Error adding address for user ${authenticatedUser.uid}:`, error);
    if (error.type === 'entity.parse.failed') {
      return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while adding address.' }, { status: 500 });
  }
}
export const POST = withAuth(addAddressHandler);
