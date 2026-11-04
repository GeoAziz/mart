import { NextRequest, NextResponse } from 'next/server';
import { firestoreAdmin as db } from '@/lib/firebase-admin';
import type { Product } from '@/lib/types';

/**
 * POST /api/cart/revalidate
 * Atomic Pre-Cart & Pre-Checkout Revalidation Gateway.
 *
 * Requirements:
 * - Ensures recommended products from CommerceMind AI are verified against live Firestore inventory
 *   at the exact moment a customer attempts to add them to their cart.
 * - Confirms status is 'active', stock is sufficient (>= requestedQuantity), and returns live price.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, expectedPrice, quantity = 1 } = body;

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "productId"' },
        { status: 400 }
      );
    }

    const docRef = db.collection('products').doc(productId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          status: 'inactive_or_not_found',
          isEligible: false,
          message: 'This product is no longer available in the marketplace catalog.',
        },
        { status: 404 }
      );
    }

    const data = docSnap.data() as Product;

    // Check status
    if (data.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          status: 'inactive_or_not_found',
          isEligible: false,
          message: 'This product listing is currently inactive.',
          currentStock: data.stock ?? 0,
        },
        { status: 400 }
      );
    }

    const currentStock = data.stock ?? 0;
    const currentPrice = data.price ?? 0;

    // Check stock availability
    if (currentStock < quantity) {
      return NextResponse.json(
        {
          success: false,
          status: 'insufficient_stock',
          isEligible: false,
          currentStock,
          currentPrice,
          message:
            currentStock === 0
              ? 'This item has just sold out.'
              : `Only ${currentStock} unit(s) remaining in stock.`,
        },
        { status: 409 }
      );
    }

    // Check price drift
    let priceChanged = false;
    if (expectedPrice !== undefined && expectedPrice !== null) {
      const exp = parseFloat(String(expectedPrice));
      if (!isNaN(exp) && Math.abs(exp - currentPrice) > 0.01) {
        priceChanged = true;
      }
    }

    return NextResponse.json({
      success: true,
      status: priceChanged ? 'price_changed' : 'valid',
      isEligible: true,
      productId: docSnap.id,
      name: data.name,
      currentPrice,
      currentStock,
      priceChanged,
      message: priceChanged
        ? `The price has been updated from KES ${expectedPrice} to KES ${currentPrice}.`
        : 'Product inventory and price verified.',
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Failed to revalidate product';
    console.error('[Cart Revalidate Error]:', errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

