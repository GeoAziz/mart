import { NextRequest, NextResponse } from 'next/server';
import { enrichProductCatalog } from '@/lib/commercemind-client';
import { withAuth } from '@/lib/authMiddleware';

/**
 * POST /api/vendor/products/enrich
 * Merchant-facing endpoint that takes raw vendor text and returns
 * structured attributes, normalization tags, and a listing quality score.
 */
async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, category } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid "text" field in request payload' },
        { status: 400 }
      );
    }

    const enrichment = await enrichProductCatalog({
      vendorText: text,
      category,
    });

    return NextResponse.json({
      success: true,
      data: enrichment,
    });
  } catch (err: any) {
    console.error('[CommerceMind Enrich API Error]:', err.message);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to enrich product catalog',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler, ['vendor', 'admin']);

