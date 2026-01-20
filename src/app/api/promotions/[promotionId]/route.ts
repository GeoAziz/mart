
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { z } from 'zod';
import type { Promotion } from '@/lib/types';

const promotionUpdateSchema = z.object({
    code: z.string().min(4).max(20).transform(v => v.toUpperCase()).optional(),
    description: z.string().min(1).optional(),
    type: z.enum(['percentage', 'fixed_amount']).optional(),
    value: z.number().positive().optional(),
    isActive: z.boolean().optional(),
    startDate: z.string().datetime().transform(str => new Date(str)).optional(),
    endDate: z.string().datetime().transform(str => new Date(str)).optional().nullable(),
    usageLimit: z.number().int().positive().optional().nullable(),
    minPurchaseAmount: z.number().positive().optional().nullable(),
}).partial();

// PUT: Update a promotion (admin only)
async function updatePromotionHandler(req: AuthenticatedRequest, context: { params: Promise<{ promotionId: string }> }) {
  const { promotionId } = await context.params;
  if (!promotionId) {
    return NextResponse.json({ message: 'Promotion ID is missing.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validationResult = promotionUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ message: 'Validation failed', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const docRef = firestoreAdmin.collection('promotions').doc(promotionId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        return NextResponse.json({ message: 'Promotion not found.' }, { status: 404 });
    }

    const { code, ...restOfData } = validationResult.data;
    if (code) {
        const existingCodeSnap = await firestoreAdmin.collection('promotions').where('code', '==', code).limit(1).get();
        if (!existingCodeSnap.empty && existingCodeSnap.docs[0].id !== promotionId) {
            return NextResponse.json({ message: 'Another promotion with this code already exists.' }, { status: 409 });
        }
    }
    
    const dataToUpdate = {
        ...validationResult.data,
        updatedAt: new Date(),
    };

    await docRef.update(dataToUpdate);
    return NextResponse.json({ message: 'Promotion updated successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating promotion ${promotionId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while updating promotion.' }, { status: 500 });
  }
}

export const PUT = withAuth(updatePromotionHandler, 'admin');

// DELETE: Delete a promotion (admin only)
async function deletePromotionHandler(req: AuthenticatedRequest, context: { params: Promise<{ promotionId: string }> }) {
  const { promotionId } = await context.params;
  if (!promotionId) {
    return NextResponse.json({ message: 'Promotion ID is missing.' }, { status: 400 });
  }

  try {
    const docRef = firestoreAdmin.collection('promotions').doc(promotionId);
    if (!(await docRef.get()).exists) {
        return NextResponse.json({ message: 'Promotion not found.' }, { status: 404 });
    }
    await docRef.delete();
    return NextResponse.json({ message: 'Promotion deleted successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error deleting promotion ${promotionId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while deleting promotion.' }, { status: 500 });
  }
}
export const DELETE = withAuth(deletePromotionHandler, 'admin');
