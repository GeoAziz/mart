import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';

async function getProductAnalyticsHandler(req: AuthenticatedRequest) {
  const vendorId = req.userProfile.uid;

  try {
    const productsSnapshot = await firestoreAdmin
      .collection('products')
      .where('vendorId', '==', vendorId)
      .get();

    const ordersSnapshot = await firestoreAdmin
      .collection('vendorOrders')
      .where('vendorId', '==', vendorId)
      .orderBy('createdAt', 'desc')
      .get();

    const salesByProduct = new Map<string, { revenue: number; units: number }>();
    const salesPerformance: { date: string; revenue: number; units: number }[] = [];

    const totalRevenue = ordersSnapshot.docs.reduce((total, doc) => {
      const order = doc.data();
      const orderDate = (order.createdAt?.toDate() || new Date()).toISOString().split('T')[0];
      let orderRevenue = 0;
      let orderUnits = 0;

      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const price = item.price || item.unitPrice || 0;
          const quantity = item.quantity || 1;
          orderRevenue += price * quantity;
          orderUnits += quantity;
          
          if (!salesByProduct.has(item.productId)) {
            salesByProduct.set(item.productId, { revenue: 0, units: 0 });
          }
          const stats = salesByProduct.get(item.productId)!;
          stats.revenue += price * quantity;
          stats.units += quantity;
        });
      }

      salesPerformance.push({ date: orderDate, revenue: orderRevenue, units: orderUnits });
      return total + orderRevenue;
    }, 0);

    const inventoryTurnover = productsSnapshot.docs.map(doc => {
      const product = doc.data();
      const sales = salesByProduct.get(doc.id) || { revenue: 0, units: 0 };
      return {
        productId: doc.id,
        name: product.name,
        turnoverRate: sales.units > 0 ? sales.units / (product.stock || 1) : 0,
        daysInStock: 30, // Mock data for days in stock
      };
    });

    const categoryMap = new Map<string, number>();
    productsSnapshot.docs.forEach(doc => {
      const product = doc.data();
      const sales = salesByProduct.get(doc.id) || { revenue: 0, units: 0 };
      const category = product.category || 'Uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + sales.revenue);
    });
    const categoryPerformance = Array.from(categoryMap.entries()).map(([category, revenue]) => ({
      category,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
    }));

    const popularityMetrics = productsSnapshot.docs.map(doc => {
      const product = doc.data();
      // We don't have real page views yet, so we'll mock them based on sales
      const sales = salesByProduct.get(doc.id) || { revenue: 0, units: 0 };
      const views = (sales.units * 15) + Math.floor(Math.random() * 50); // Mock views
      return {
        productId: doc.id,
        name: product.name,
        views, 
        conversionRate: views > 0 ? (sales.units / views) * 100 : 0,
      };
    });

    const topProducts = Array.from(salesByProduct.entries())
      .map(([productId, sales]) => ({
        id: productId,
        name: productsSnapshot.docs.find(d => d.id === productId)?.data()?.name || 'Unknown Product',
        revenue: sales.revenue,
        units: sales.units,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return NextResponse.json({
      salesPerformance,
      inventoryTurnover,
      categoryPerformance,
      popularityMetrics,
      topProducts,
    });
  } catch (error: any) {
    console.error('Error fetching product analytics:', error);
    return NextResponse.json({ message: 'Failed to fetch analytics data' }, { status: 500 });
  }
}

export const GET = withAuth(getProductAnalyticsHandler, ['vendor', 'admin']);
