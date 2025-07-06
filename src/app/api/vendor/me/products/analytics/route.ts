import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { ProductAnalytics } from '@/lib/types';

async function getProductAnalyticsHandler(req: AuthenticatedRequest) {
  const vendorId = req.userProfile.uid;

  try {
    // Get products from this vendor
    const productsSnapshot = await firestoreAdmin
      .collection('products')
      .where('vendorId', '==', vendorId)
      .get();

    // Get sales data
    const ordersSnapshot = await firestoreAdmin
      .collection('orders')
      .where('vendorIds', 'array-contains', vendorId)
      .orderBy('createdAt', 'desc')
      .get();

    // Process orders to get sales performance data
    const salesPerformance: { date: string; revenue: number; units: number }[] = [];
    const salesByProduct = new Map();
    const totalRevenue = ordersSnapshot.docs.reduce((total, doc) => {
      const order = doc.data();
      const orderDate = order.createdAt.toDate().toISOString().split('T')[0];
      
      // Calculate revenue for this vendor's products in the order
      let orderRevenue = 0;
      let orderUnits = 0;
      
      order.items.forEach((item: any) => {
        if (item.vendorId === vendorId) {
          orderRevenue += item.price * item.quantity;
          orderUnits += item.quantity;
          
          // Track per-product sales
          if (!salesByProduct.has(item.productId)) {
            salesByProduct.set(item.productId, { revenue: 0, units: 0 });
          }
          const productStats = salesByProduct.get(item.productId);
          productStats.revenue += item.price * item.quantity;
          productStats.units += item.quantity;
        }
      });

      // Add to daily performance metrics
      salesPerformance.push({
        date: orderDate,
        revenue: orderRevenue,
        units: orderUnits
      });

      return total + orderRevenue;
    }, 0);

    // Get inventory metrics
    const inventoryTurnover = productsSnapshot.docs.map(doc => {
      const product = doc.data();
      const sales = salesByProduct.get(doc.id) || { revenue: 0, units: 0 };
      return {
        productId: doc.id,
        name: product.name,
        turnoverRate: sales.units > 0 ? sales.units / (product.stock || 1) : 0,
        daysInStock: 30 // This would ideally be calculated from historical stock data
      };
    });

    // Calculate category performance
    const categoryPerformance = Array.from(productsSnapshot.docs.reduce((acc, doc) => {
      const product = doc.data();
      const sales = salesByProduct.get(doc.id) || { revenue: 0, units: 0 };
      if (!acc.has(product.category)) {
        acc.set(product.category, { revenue: 0, percentage: 0 });
      }
      const categoryStats = acc.get(product.category);
      categoryStats.revenue += sales.revenue;
      return acc;
    }, new Map())).map(([category, stats]) => ({
      category,
      revenue: stats.revenue,
      percentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0
    }));

    // Get popularity metrics (views and conversion rates would ideally come from analytics service)
    const popularityMetrics = productsSnapshot.docs.map(doc => {
      const product = doc.data();
      const sales = salesByProduct.get(doc.id) || { revenue: 0, units: 0 };
      return {
        productId: doc.id,
        name: product.name,
        views: Math.floor(Math.random() * 1000), // Example: Replace with real analytics data
        conversionRate: Math.random() * 5 // Example: Replace with real analytics data
      };
    });

    // Get top products
    const topProducts = Array.from(salesByProduct.entries())
      .map(([productId, sales]) => ({
        id: productId,
        name: productsSnapshot.docs.find(doc => doc.id === productId)?.data()?.name || 'Unknown Product',
        revenue: sales.revenue,
        units: sales.units
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const analyticsData = {
      salesPerformance,
      inventoryTurnover,
      categoryPerformance,
      popularityMetrics,
      topProducts
    };

    return NextResponse.json(analyticsData);
  } catch (error: any) {
    console.error('Error fetching product analytics:', error);
    return NextResponse.json(
      { message: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getProductAnalyticsHandler, ['vendor']);
