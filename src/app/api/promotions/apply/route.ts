
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { Promotion, AppliedPromotion } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { toDate } from '@/lib/date';

const applyCodeSchema = z.object({
  code: z.string().min(1).transform(v => v.toUpperCase()),
  subtotal: z.number().min(0),
});

// Helper to check all conditions for a promotion
function validatePromotion(promotion: Promotion, subtotal: number): { isValid: boolean; message: string } {
    if (!promotion.isActive) return { isValid: false, message: 'This promotion is not currently active.' };
    
    const now = new Date();
    const start = toDate(promotion.startDate);
    const end = toDate(promotion.endDate);
    if (start && start > now) return { isValid: false, message: 'This promotion has not started yet.' };
    if (end && end < now) return { isValid: false, message: 'This promotion has expired.' };
    
    if (promotion.usageLimit && promotion.timesUsed >= promotion.usageLimit) return { isValid: false, message: 'This promotion has reached its usage limit.' };
    
    if (promotion.minPurchaseAmount && subtotal < promotion.minPurchaseAmount) {
        return { isValid: false, message: `This promotion requires a minimum purchase of KSh ${promotion.minPurchaseAmount.toLocaleString()}.` };
    }
    
    return { isValid: true, message: 'Promotion applied successfully.' };
}


// POST: Apply a promotion code
async function applyPromotionHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const validationResult = applyCodeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ message: 'Invalid request body.', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    const { code, subtotal } = validationResult.data;

    const promoQuery = firestoreAdmin.collection('promotions').where('code', '==', code).limit(1);
    const promoSnapshot = await promoQuery.get();

    if (promoSnapshot.empty) {
        return NextResponse.json({ message: 'Invalid promotion code.' }, { status: 404 });
    }

    const doc = promoSnapshot.docs[0];
    const raw = doc.data();
    const promotion: Promotion = {
      id: doc.id,
      ...raw,
      startDate: toDate(raw.startDate) ?? undefined,
      endDate: raw.endDate ? (toDate(raw.endDate) ?? undefined) : undefined,
      createdAt: toDate(raw.createdAt) ?? new Date(),
      updatedAt: toDate(raw.updatedAt) ?? new Date(),
    } as Promotion;

    const validation = validatePromotion(promotion, subtotal);
    if (!validation.isValid) {
        return NextResponse.json({ message: validation.message }, { status: 400 });
    }
    
    let discountAmount = 0;
    if (promotion.type === 'percentage') {
        discountAmount = subtotal * (promotion.value / 100);
    } else if (promotion.type === 'fixed_amount') {
        discountAmount = promotion.value;
    }
    // Ensure discount doesn't exceed subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    const appliedPromotion: AppliedPromotion = {
        ...promotion,
        discountAmount: parseFloat(discountAmount.toFixed(2))
    };

    return NextResponse.json({ message: validation.message, promotion: appliedPromotion }, { status: 200 });

  } catch (error: any) {
    console.error('Error applying promotion:', error);
    return NextResponse.json({ message: 'Internal Server Error while applying promotion.' }, { status: 500 });
  }
}

export const POST = withAuth(applyPromotionHandler);
