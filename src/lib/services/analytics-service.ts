import { db } from '@/lib/firebase-admin';
import {
  SalesMetrics,
  ProductPerformanceMetrics,
  CategoryAnalytics,
  InventoryAlerts,
  AnalyticsDashboard
} from '../types';
import { Timestamp } from 'firebase-admin/firestore';

export class AnalyticsService {
  private static instance: AnalyticsService;

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Calculate sales metrics for different time periods
   */
  async calculateSalesMetrics(vendorId: string, period: 'day' | 'week' | 'month' = 'day'): Promise<SalesMetrics> {
    const now = new Date();
    const startDate = new Date(now);
    
    // Calculate start date based on period
    switch(period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 90); // Last 90 days
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
        break;
    }

    const ordersRef = db.collection('orders');
    const orders = await ordersRef
      .where('vendorId', '==', vendorId)
      .where('createdAt', '>=', Timestamp.fromDate(startDate))
      .get();

    // Process orders into metrics
    const metrics: SalesMetrics = {
      daily: [],
      weekly: [],
      monthly: []
    };

    // Group orders by date
    const ordersByDate = new Map<string, any[]>();
    orders.docs.forEach(doc => {
      const order = doc.data();
      const date = order.createdAt.toDate().toISOString().split('T')[0];
      if (!ordersByDate.has(date)) {
        ordersByDate.set(date, []);
      }
      ordersByDate.get(date)?.push(order);
    });

    // Calculate daily metrics
    for (const [date, dailyOrders] of ordersByDate) {
      const dailyRevenue = dailyOrders.reduce((sum, order) => sum + order.total, 0);
      const uniqueCustomers = new Set(dailyOrders.map(order => order.customerId)).size;

      metrics.daily.push({
        date,
        revenue: dailyRevenue,
        orders: dailyOrders.length,
        averageOrderValue: dailyRevenue / dailyOrders.length,
        uniqueCustomers
      });
    }

    // Sort metrics by date
    metrics.daily.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate weekly and monthly aggregates
    metrics.weekly = this.aggregateMetricsByPeriod(metrics.daily, 'week');
    metrics.monthly = this.aggregateMetricsByPeriod(metrics.daily, 'month');

    return metrics;
  }

  /**
   * Track product performance including views, sales, and inventory
   */
  async getProductPerformance(productId: string): Promise<ProductPerformanceMetrics> {
    const productRef = db.collection('products').doc(productId);
    const product = await productRef.get();
    const productData = product.data();

    if (!productData) {
      throw new Error('Product not found');
    }

    // Get views, purchases, and inventory data
    const [views, purchases, inventory] = await Promise.all([
      this.getProductViews(productId),
      this.getProductPurchases(productId),
      this.getInventoryMetrics(productId)
    ]);

    const metrics: ProductPerformanceMetrics = {
      id: productId,
      name: productData.name,
      metrics: {
        views: views.total,
        uniqueViews: views.unique,
        purchases: purchases.count,
        revenue: purchases.revenue,
        conversionRate: (purchases.count / views.total) * 100,
        averageRating: productData.averageRating || 0,
        reviewCount: productData.reviewCount || 0,
        inventory: {
          current: inventory.currentStock,
          incoming: inventory.incomingStock,
          reorderPoint: inventory.reorderPoint,
          turnoverRate: inventory.turnoverRate,
          daysToStockout: inventory.daysToStockout,
          restockPrediction: inventory.restockPrediction
        },
        trends: {
          viewsTrend: this.calculateTrend(views.history),
          salesTrend: this.calculateTrend(purchases.history),
          ratingTrend: 0 // Implement rating trend calculation
        }
      },
      historicalData: this.mergeHistoricalData(views.history, purchases.history)
    };

    return metrics;
  }

  /**
   * Analyze category performance and trends
   */
  async getCategoryAnalytics(categoryId: string): Promise<CategoryAnalytics> {
    const categoryRef = db.collection('categories').doc(categoryId);
    const category = await categoryRef.get();
    const categoryData = category.data();

    if (!categoryData) {
      throw new Error('Category not found');
    }

    const productsRef = db.collection('products').where('categoryId', '==', categoryId);
    const products = await productsRef.get();

    const productIds = products.docs.map(doc => doc.id);
    const [sales, trends] = await Promise.all([
      this.getCategorySales(categoryId),
      this.getCategoryTrends(categoryId)
    ]);

    const metrics: CategoryAnalytics = {
      id: categoryId,
      name: categoryData.name,
      metrics: {
        totalRevenue: sales.totalRevenue,
        totalSales: sales.totalSales,
        averageOrderValue: sales.totalRevenue / sales.totalSales,
        productCount: productIds.length,
        topProducts: sales.topProducts,
        growth: {
          revenue: this.calculateGrowth(trends.monthly, 'revenue'),
          sales: this.calculateGrowth(trends.monthly, 'sales'),
          products: this.calculateGrowth(trends.monthly, 'products')
        },
        trends: trends
      }
    };

    return metrics;
  }

  /**
   * Generate inventory alerts based on stock levels and sales velocity
   */
  async generateInventoryAlerts(vendorId: string): Promise<InventoryAlerts[]> {
    const productsRef = db.collection('products').where('vendorId', '==', vendorId);
    const products = await productsRef.get();

    const alerts: InventoryAlerts[] = [];

    for (const product of products.docs) {
      const productData = product.data();
      const inventory = await this.getInventoryMetrics(product.id);

      if (inventory.currentStock <= inventory.reorderPoint) {
        alerts.push({
          id: `alert-${product.id}-${Date.now()}`,
          productId: product.id,
          productName: productData.name,
          type: inventory.currentStock === 0 ? 'out_of_stock' : 'low_stock',
          currentStock: inventory.currentStock,
          reorderPoint: inventory.reorderPoint,
          suggestedAction: `Reorder ${inventory.restockPrediction.suggestedQuantity} units`,
          priority: inventory.currentStock === 0 ? 'high' : 'medium',
          createdAt: new Date()
        });
      }
    }

    return alerts;
  }

  private aggregateMetricsByPeriod(dailyMetrics: any[], period: 'week' | 'month') {
    // Implementation for aggregating metrics by week or month
    return [];
  }

  private async getProductViews(productId: string) {
    // Implementation for getting product views
    return { total: 0, unique: 0, history: [] };
  }

  private async getProductPurchases(productId: string) {
    // Implementation for getting product purchases
    return { count: 0, revenue: 0, history: [] };
  }

  private async getInventoryMetrics(productId: string) {
    // Implementation for getting inventory metrics
    return {
      currentStock: 0,
      incomingStock: 0,
      reorderPoint: 0,
      turnoverRate: 0,
      daysToStockout: null,
      restockPrediction: {
        suggestedQuantity: 0,
        suggestedDate: new Date()
      }
    };
  }

  private calculateTrend(history: any[]): number {
    // Implementation for calculating trends
    return 0;
  }

  private mergeHistoricalData(views: any[], purchases: any[]) {
    // Implementation for merging historical data
    return [];
  }

  private async getCategorySales(categoryId: string) {
    // Implementation for getting category sales
    return {
      totalRevenue: 0,
      totalSales: 0,
      topProducts: []
    };
  }

  private async getCategoryTrends(categoryId: string) {
    // Implementation for getting category trends
    return {
      daily: [],
      weekly: [],
      monthly: []
    };
  }

  private calculateGrowth(data: any[], metric: string): number {
    // Implementation for calculating growth
    return 0;
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();
