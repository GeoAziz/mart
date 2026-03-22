
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { z } from 'zod';
import type { Timestamp } from 'firebase-admin/firestore';
import type { Promotion } from '@/lib/types';
import { toDate } from '@/lib/date';

const promotionSchema = z.object({
    code: z.string().min(4).max(20).transform(v => v.toUpperCase()),
    description: z.string().min(1),
    type: z.enum(['percentage', 'fixed_amount']),
    value: z.number().positive(),
    isActive: z.boolean(),
    startDate: z.string().datetime().transform(str => new Date(str)),
    endDate: z.string().datetime().transform(str => new Date(str)).optional(),
    usageLimit: z.number().int().positive().optional(),
    minPurchaseAmount: z.number().positive().optional(),
});

function mapPromotionDocument(doc: FirebaseFirestore.DocumentSnapshot): Promotion {
  const data = doc.data() as Omit<Promotion, 'id'>;
  return {
    id: doc.id,
    ...data,
    startDate: toDate(data.startDate) ?? undefined,
    endDate: data.endDate ? (toDate(data.endDate) ?? undefined) : undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

// GET all promotions (admin only)
export async function GET(req: AuthenticatedRequest) {
  try {
    const snapshot = await firestoreAdmin.collection('promotions').orderBy('createdAt', 'desc').get();
    const promotions = snapshot.docs.map(mapPromotionDocument);
    return NextResponse.json(promotions, { status: 200 });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json({ message: 'Internal Server Error while fetching promotions.' }, { status: 500 });
  }
}

// POST: Create a new promotion (admin only)
async function createPromotionHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const validationResult = promotionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ message: 'Validation failed', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { code, ...restOfData } = validationResult.data;
    
    // Check if code already exists
    const existingCodeSnap = await firestoreAdmin.collection('promotions').where('code', '==', code).limit(1).get();
    if (!existingCodeSnap.empty) {
        return NextResponse.json({ message: 'A promotion with this code already exists.' }, { status: 409 });
    }

    const now = new Date();
    const promotionData = {
      ...restOfData,
      code,
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await firestoreAdmin.collection('promotions').add(promotionData);
    const createdPromotion = mapPromotionDocument(await docRef.get());

    return NextResponse.json(createdPromotion, { status: 201 });
  } catch (error: any) {
    console.error('Error creating promotion:', error);
    return NextResponse.json({ message: 'Internal Server Error while creating promotion.' }, { status: 500 });
  }
}

export const POST = withAuth(createPromotionHandler, 'admin');
