import { db } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function fetchVendorAnalytics(
  vendorId: string,
  filter?: any // Use any or define a proper type for filter
): Promise<any> { // Use any or define a proper type for ProductAnalytics
  try {
    // Fetch base data using Admin SDK
    const ordersRef = db.collection('orders');
    const productsRef = db.collection('products');
    const analyticsRef = db.collection('analytics');

    // Apply time frame filter
    let orderQuery = ordersRef.where('vendorId', '==', vendorId);
    let analyticsQuery = analyticsRef.where('vendorId', '==', vendorId);
    if (filter?.timeframe) {
      orderQuery = orderQuery
        .where('createdAt', '>=', Timestamp.fromDate(filter.timeframe.startDate))
        .where('createdAt', '<=', Timestamp.fromDate(filter.timeframe.endDate));
      analyticsQuery = analyticsQuery
        .where('createdAt', '>=', Timestamp.fromDate(filter.timeframe.startDate))
        .where('createdAt', '<=', Timestamp.fromDate(filter.timeframe.endDate));
    }

    // Fetch orders for sales performance
    const orderDocs = await orderQuery.get();

    // Process orders into sales metrics
    const salesByDate = new Map();
    orderDocs.docs.forEach(doc => {
      const order = doc.data();
      const date = order.createdAt.toDate().toISOString().split('T')[0];
      if (!salesByDate.has(date)) {
        salesByDate.set(date, { revenue: 0, units: 0 });
      }
      const currentSales = salesByDate.get(date);
      salesByDate.set(date, {
        revenue: currentSales.revenue + order.total,
        units: currentSales.units + order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
      });
    });

    // Fetch product analytics data
    const analyticsDocs = await analyticsQuery.get();

    // Process product analytics
    const productViews = new Map();
    analyticsDocs.docs.forEach(doc => {
      const analytics = doc.data();
      if (!productViews.has(analytics.productId)) {
        productViews.set(analytics.productId, {
          views: 0,
          sales: 0
        });
      }
      const current = productViews.get(analytics.productId);
      productViews.set(analytics.productId, {
        views: current.views + analytics.views,
        sales: current.sales + analytics.sales
      });
    });

    // Calculate popularity metrics
    const popularityMetrics = Array.from(productViews.entries()).map(([productId, data]) => ({
      productId,
      name: '', // Will be populated from products data
      views: data.views,
      conversionRate: data.sales > 0 ? (data.sales / data.views) * 100 : 0
    }));

    // Fetch product details to get names and categories
    const productsQuery = productsRef.where('vendorId', '==', vendorId);
    const productDocs = await productsQuery.get();
    const products = new Map();
    productDocs.docs.forEach(doc => {
      products.set(doc.id, { ...doc.data(), id: doc.id });
    });

    // Calculate category performance
    const categoryRevenue = new Map();
    const categoryUnits = new Map();
    let totalRevenue = 0;
    let totalUnits = 0;
    orderDocs.docs.forEach(doc => {
      const order = doc.data();
      order.items.forEach((item: any) => {
        const product = products.get(item.productId);
        if (product) {
          const category = product.category;
          const revenue = item.price * item.quantity;
          totalRevenue += revenue;
          totalUnits += item.quantity;
          if (!categoryRevenue.has(category)) {
            categoryRevenue.set(category, 0);
            categoryUnits.set(category, 0);
          }
          categoryRevenue.set(category, categoryRevenue.get(category) + revenue);
          categoryUnits.set(category, categoryUnits.get(category) + item.quantity);
        }
      });
    });

    // Format response data
    const analytics: any = {
      salesPerformance: Array.from(salesByDate.entries()).map(([date, data]) => ({
        date,
        ...data
      })),
      popularityMetrics: popularityMetrics.map(metric => ({
        ...metric,
        name: products.get(metric.productId)?.name || 'Unknown Product'
      })),
      inventoryTurnover: Array.from(products.values()).map(product => ({
        productId: product.id,
        name: product.name,
        turnoverRate: calculateTurnoverRate(product, orderDocs.docs),
        daysInStock: calculateDaysInStock(product)
      })),
      categoryPerformance: Array.from(categoryRevenue.entries()).map(([category, revenue]) => ({
        id: category,
        name: category,
        units: categoryUnits.get(category) || 0,
        revenue,
        growth: 0 // Placeholder, implement growth calculation if needed
      })),
      topProducts: calculateTopProducts(orderDocs.docs, products)
    };

    return analytics;
  } catch (error) {
    console.error('Error fetching vendor analytics:', error);
    throw new Error('Failed to fetch analytics data');
  }
}

// Helper functions
function calculateTurnoverRate(product: any, orderDocs: any[]): number {
  const totalSold = orderDocs.reduce((sum, doc) => {
    const order = doc.data();
    const item = order.items.find((i: any) => i.productId === product.id);
    return sum + (item?.quantity || 0);
  }, 0);
  return totalSold / (product.stockLevel || 1);
}

function calculateDaysInStock(product: any): number {
  const createdAt = product.createdAt?.toDate ? product.createdAt.toDate() : new Date();
  const now = new Date();
  return Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateTopProducts(orderDocs: any[], products: Map<string, any>) {
  const productSales = new Map();
  orderDocs.forEach(doc => {
    const order = doc.data();
    order.items.forEach((item: any) => {
      if (!productSales.has(item.productId)) {
        productSales.set(item.productId, { revenue: 0, units: 0 });
      }
      const current = productSales.get(item.productId);
      productSales.set(item.productId, {
        revenue: current.revenue + (item.price * item.quantity),
        units: current.units + item.quantity
      });
    });
  });
  return Array.from(productSales.entries())
    .map(([id, data]) => ({
      id,
      name: products.get(id)?.name || 'Unknown Product',
      ...data
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}
