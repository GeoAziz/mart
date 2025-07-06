import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { Timestamp } from 'firebase-admin/firestore';

async function getOrderAnalyticsHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days by default
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();

  try {
    let ordersQuery: FirebaseFirestore.Query = firestoreAdmin.collection('orders');

    // Filter by user role
    if (authenticatedUser.role === 'vendor') {
      ordersQuery = ordersQuery.where('vendorIds', 'array-contains', authenticatedUser.uid);
    } else if (authenticatedUser.role === 'customer') {
      ordersQuery = ordersQuery.where('userId', '==', authenticatedUser.uid);
    }

    // Add date range filter
    ordersQuery = ordersQuery
      .where('createdAt', '>=', Timestamp.fromDate(startDate))
      .where('createdAt', '<=', Timestamp.fromDate(endDate))
      .orderBy('createdAt', 'desc');

    const ordersSnapshot = await ordersQuery.get();

    // Initialize analytics data structure
    const analytics = {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      ordersByStatus: {} as Record<string, number>,
      dailyOrders: [] as Array<{ date: string; orders: number; revenue: number }>,
      topProducts: [] as Array<{ productId: string; name: string; quantity: number; revenue: number }>,
      productPerformance: new Map<string, { quantity: number; revenue: number }>()
    };

    // Process orders
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      analytics.totalOrders++;
      analytics.totalRevenue += order.totalAmount;

      // Count orders by status
      analytics.ordersByStatus[order.status] = (analytics.ordersByStatus[order.status] || 0) + 1;

      // Group by date for daily metrics
      const orderDate = order.createdAt.toDate().toISOString().split('T')[0];
      const dailyData = analytics.dailyOrders.find(d => d.date === orderDate);
      if (dailyData) {
        dailyData.orders++;
        dailyData.revenue += order.totalAmount;
      } else {
        analytics.dailyOrders.push({
          date: orderDate,
          orders: 1,
          revenue: order.totalAmount
        });
      }

      // Track product performance
      order.items.forEach((item: any) => {
        if (!analytics.productPerformance.has(item.productId)) {
          analytics.productPerformance.set(item.productId, {
            quantity: 0,
            revenue: 0
          });
        }
        const productStats = analytics.productPerformance.get(item.productId)!;
        productStats.quantity += item.quantity;
        productStats.revenue += item.price * item.quantity;
      });
    });

    // Calculate average order value
    analytics.averageOrderValue = analytics.totalOrders > 0 
      ? analytics.totalRevenue / analytics.totalOrders 
      : 0;

    // Convert product performance map to sorted array for top products
    analytics.topProducts = Array.from(analytics.productPerformance.entries())
      .map(([productId, stats]) => ({
        productId,
        name: '', // Will be populated below
        quantity: stats.quantity,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Fetch product names for top products
    const productIds = analytics.topProducts.map(p => p.productId);
    const productsSnapshot = await firestoreAdmin
      .collection('products')
      .where('__name__', 'in', productIds)
      .get();
    
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      const topProduct = analytics.topProducts.find(p => p.productId === doc.id);
      if (topProduct) {
        topProduct.name = product.name;
      }
    });

    // Sort daily orders chronologically
    analytics.dailyOrders.sort((a, b) => a.date.localeCompare(b.date));

    // Convert the Map to an array of product performance data
    const productPerformanceArray = Array.from(analytics.productPerformance.entries()).map(([productId, data]) => ({
      productId,
      ...data
    }));

    // Return only the needed data without the Map
    return NextResponse.json({
      ...analytics,
      productPerformance: productPerformanceArray
    });
  } catch (error: any) {
    console.error('Error fetching order analytics:', error);
    return NextResponse.json(
      { message: 'Failed to fetch order analytics' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getOrderAnalyticsHandler);
