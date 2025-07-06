import { NextResponse } from 'next/server';
import { analyticsService } from '@/lib/services/analytics-service';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';

export const GET = withAuth(
  async (req: AuthenticatedRequest) => {
    const { userProfile } = req;
    const isVendor = userProfile.role === 'vendor';
    const vendorId = userProfile.uid;

    if (!isVendor || !vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
      // Get query parameters
      const { type, id, period } = Object.fromEntries(new URL(req.url).searchParams);

      let data;
      switch (type) {
        case 'sales':
          data = await analyticsService.calculateSalesMetrics(vendorId, period as any);
          break;
        case 'product':
          if (!id) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
          }
          data = await analyticsService.getProductPerformance(id);
          break;
        case 'category':
          if (!id) {
            return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
          }
          data = await analyticsService.getCategoryAnalytics(id);
          break;
        case 'inventory':
          data = await analyticsService.generateInventoryAlerts(vendorId);
          break;
        default:
          return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
      }

      return NextResponse.json(data);
    } catch (error: any) {
      console.error('Analytics API Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch analytics' },
        { status: 500 }
      );
    }
  },
  ['vendor', 'admin']
);
