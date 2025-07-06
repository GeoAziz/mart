import { ProductAnalytics, AnalyticsFilter } from '@/lib/types/analytics';
import { auth, db } from '@/lib/firebase-admin';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export async function fetchVendorAnalytics(
  vendorId: string,
  filter?: AnalyticsFilter
): Promise<ProductAnalytics> {
  try {
    // Fetch base data
    const ordersRef = collection(db, 'orders');
    const productsRef = collection(db, 'products');
    const analyticsRef = collection(db, 'analytics');

    // Apply time frame filter
    const timeFilter = filter?.timeframe 
      ? [
          where('createdAt', '>=', Timestamp.fromDate(filter.timeframe.startDate)),
          where('createdAt', '<=', Timestamp.fromDate(filter.timeframe.endDate))
        ]
      : [];

    // Fetch orders for sales performance
    const orderQuery = query(
      ordersRef,
      where('vendorId', '==', vendorId),
      ...timeFilter
    );
    const orderDocs = await getDocs(orderQuery);

    // Process orders into sales metrics
    const salesByDate = new Map();
    orderDocs.forEach(doc => {
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
    const analyticsQuery = query(
      analyticsRef,
      where('vendorId', '==', vendorId),
      ...timeFilter
    );
    const analyticsDocs = await getDocs(analyticsQuery);

    // Process product analytics
    const productViews = new Map();
    const productSales = new Map();
    analyticsDocs.forEach(doc => {
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
    const productsQuery = query(
      productsRef,
      where('vendorId', '==', vendorId)
    );
    const productDocs = await getDocs(productsQuery);
    const products = new Map();
    productDocs.forEach(doc => {
      products.set(doc.id, doc.data());
    });

    // Calculate category performance
    const categoryRevenue = new Map();
    let totalRevenue = 0;

    orderDocs.forEach(doc => {
      const order = doc.data();
      order.items.forEach((item: any) => {
        const product = products.get(item.productId);
        if (product) {
          const category = product.category;
          const revenue = item.price * item.quantity;
          totalRevenue += revenue;
          
          if (!categoryRevenue.has(category)) {
            categoryRevenue.set(category, 0);
          }
          categoryRevenue.set(category, categoryRevenue.get(category) + revenue);
        }
      });
    });

    // Format response data
    const analytics: ProductAnalytics = {
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
        turnoverRate: calculateTurnoverRate(product, orderDocs),
        daysInStock: calculateDaysInStock(product)
      })),
      categoryPerformance: Array.from(categoryRevenue.entries()).map(([category, revenue]) => ({
        category,
        revenue,
        percentage: (revenue / totalRevenue) * 100
      })),
      topProducts: calculateTopProducts(orderDocs, products)
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
  const createdAt = product.createdAt?.toDate() || new Date();
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
