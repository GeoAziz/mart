import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { getVendorGA4Metrics } from '@/lib/ga4-data-client';

/**
 * GET /api/vendors/me/analytics/ga4
 * Provides vendors with live Google Analytics 4 performance metrics:
 * - Product views (itemsViewed)
 * - Cart adds (itemsAddedToCart)
 * - Sales conversions (itemsPurchased)
 * - Generated revenue (itemRevenue)
 * - Cart-to-view rate
 */
async function getVendorGA4AnalyticsHandler(req: AuthenticatedRequest) {
  const { userProfile } = req;
  const isVendor = userProfile.role === 'vendor' || userProfile.role === 'admin';
  const vendorId = userProfile.uid;

  if (!isVendor || !vendorId) {
    return NextResponse.json({ error: 'Unauthorized: Vendor access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(Number(searchParams.get('days')) || 7, 1), 90);

  try {
    const metrics = await getVendorGA4Metrics(vendorId, days);
    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    console.error('[VendorAnalytics:GA4] Error fetching vendor metrics:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch GA4 metrics' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getVendorGA4AnalyticsHandler, ['vendor', 'admin']);

