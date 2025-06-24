
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { z } from 'zod';
import type { Timestamp } from 'firebase-admin/firestore';
import type { Address } from '../route'; // Import Address type from the list route

const addressUpdateSchema = z.object({
  label: z.string().min(1, "Label is required.").optional(),
  fullName: z.string().min(2, "Full name is required.").optional(),
  addressLine1: z.string().min(5, "Address line 1 is required.").optional(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(2, "City is required.").optional(),
  postalCode: z.string().optional().nullable(),
  phone: z.string().min(10, "A valid phone number is required.").optional(),
  isDefault: z.boolean().optional(),
}).partial().refine(obj => Object.keys(obj).length > 0, "At least one field must be provided for update.");


// Helper to safely convert Firestore data to our Address type for client
function mapFirestoreDocToAddress(doc: FirebaseFirestore.DocumentSnapshot): Address {
  const data = doc.data();
  if (!data) {
    console.error(`Address document ${doc.id} has no data.`);
    throw new Error(`Address document ${doc.id} is missing data.`);
  }

  const createdAt = data.createdAt;
  const updatedAt = data.updatedAt;

  return {
    id: doc.id,
    label: data.label || 'N/A',
    fullName: data.fullName || 'N/A',
    addressLine1: data.addressLine1 || 'N/A',
    addressLine2: data.addressLine2,
    city: data.city || 'N/A',
    postalCode: data.postalCode,
    phone: data.phone || 'N/A',
    isDefault: data.isDefault || false,
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate() : (createdAt ? new Date(createdAt) : new Date()),
    updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate() : (updatedAt ? new Date(updatedAt) : new Date()),
  };
}

// PUT handler to update an existing address
async function updateAddressHandler(req: AuthenticatedRequest, context: { params: { addressId: string } }) {
  const authenticatedUser = req.userProfile;
  const addressId = context.params.addressId;

  if (!addressId) {
    return NextResponse.json({ message: 'Address ID is missing.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validationResult = addressUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ message: "Validation failed", errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const dataToUpdateFromClient = validationResult.data;
    const now = new Date();
    
    const addressDocRef = firestoreAdmin
      .collection('users')
      .doc(authenticatedUser.uid)
      .collection('addresses')
      .doc(addressId);

    await firestoreAdmin.runTransaction(async (transaction) => {
        const addressDocSnap = await transaction.get(addressDocRef);
        if (!addressDocSnap.exists) {
            throw new Error('Address not found or you do not have permission to update it.');
        }

        const dataToUpdateForFirestore: any = { ...dataToUpdateFromClient, updatedAt: now };
        
        // Ensure isDefault is explicitly false if not provided and not being set to true
        if (dataToUpdateFromClient.isDefault === undefined) {
            // If isDefault is not in the payload, don't change it unless explicitly set
            // However, if the transaction logic below depends on it, ensure it's present
            // For now, let's assume if not present, it doesn't change from current value.
            // But to be safe, we could fetch current value:
            // dataToUpdateForFirestore.isDefault = addressDocSnap.data()?.isDefault || false;
        } else {
             dataToUpdateForFirestore.isDefault = dataToUpdateFromClient.isDefault;
        }


        if (dataToUpdateForFirestore.isDefault === true) {
            const currentDefaultQuery = firestoreAdmin
            .collection('users')
            .doc(authenticatedUser.uid)
            .collection('addresses')
            .where('isDefault', '==', true);
            
            const currentDefaultSnapshot = await transaction.get(currentDefaultQuery);
            currentDefaultSnapshot.forEach(doc => {
                if (doc.id !== addressId) { 
                    transaction.update(doc.ref, { isDefault: false, updatedAt: now });
                }
            });
        }
        transaction.update(addressDocRef, dataToUpdateForFirestore);
    });
    
    const updatedAddressSnap = await addressDocRef.get();
    if (!updatedAddressSnap.exists) {
        throw new Error("Failed to retrieve updated address after transaction.");
    }
    const updatedAddressResponse = mapFirestoreDocToAddress(updatedAddressSnap);

    return NextResponse.json(updatedAddressResponse, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating address ${addressId} for user ${authenticatedUser.uid}:`, error);
    if (error.message.includes('Address not found')) {
        return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error.type === 'entity.parse.failed') {
      return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while updating address.' }, { status: 500 });
  }
}
export const PUT = withAuth(updateAddressHandler);


// DELETE handler to remove an address
async function deleteAddressHandler(req: AuthenticatedRequest, context: { params: { addressId: string } }) {
  const authenticatedUser = req.userProfile;
  const addressId = context.params.addressId;

  if (!addressId) {
    return NextResponse.json({ message: 'Address ID is missing.' }, { status: 400 });
  }

  try {
    const addressDocRef = firestoreAdmin
      .collection('users')
      .doc(authenticatedUser.uid)
      .collection('addresses')
      .doc(addressId);

    const addressDocSnap = await addressDocRef.get();
    if (!addressDocSnap.exists) {
        return NextResponse.json({ message: 'Address not found or you do not have permission to delete it.' }, { status: 404 });
    }
    
    await addressDocRef.delete();
    return NextResponse.json({ message: 'Address deleted successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error(`Error deleting address ${addressId} for user ${authenticatedUser.uid}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while deleting address.' }, { status: 500 });
  }
}
export const DELETE = withAuth(deleteAddressHandler);
