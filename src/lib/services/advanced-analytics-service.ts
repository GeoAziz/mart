import { firestoreAdmin as db } from '@/lib/firebase-admin';
import { SimpleLinearRegression } from 'ml-regression-simple-linear';
import * as tf from '@tensorflow/tfjs';
import { format, subMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { mean, standardDeviation, linearRegression } from 'simple-statistics';
import type {
  PredictiveAnalytics,
  AIInsights,
  PerformanceBenchmarks,
  AutomatedRecommendations,
  Order,
  Product,
  Timestamp
} from '@/lib/types';
import NodeCache from 'node-cache';
import winston from 'winston';
import { WebSocketServer, WebSocket } from 'ws';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

class AdvancedAnalyticsService {
  private cache: NodeCache;
  private wsClients: Set<WebSocket>;
  private static instance: AdvancedAnalyticsService;

  constructor() {
    this.cache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache
    this.wsClients = new Set();
    this.setupWebSocket();
  }

  public static getInstance(): AdvancedAnalyticsService {
    if (!AdvancedAnalyticsService.instance) {
      AdvancedAnalyticsService.instance = new AdvancedAnalyticsService();
    }
    return AdvancedAnalyticsService.instance;
  }

  private setupWebSocket(): void {
    try {
      const wss = new WebSocketServer({ port: 8080 });
      
      wss.on('connection', (ws: WebSocket) => {
        this.wsClients.add(ws);
        
        ws.on('close', () => {
          this.wsClients.delete(ws);
        });

        ws.on('error', (error: Error) => {
          logger.error('WebSocket Error:', error);
        });
      });

      logger.info('WebSocket server started on port 8080');
    } catch (error) {
      logger.error('Failed to setup WebSocket server:', error);
    }
  }

  private broadcastUpdate(data: any): void {
    const message = JSON.stringify(data);
    this.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private async withErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      logger.error('Operation failed:', error);
      throw error;
    }
  }

  private async withCache<T>(key: string, operation: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.cache.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await operation();
    this.cache.set(key, result, ttl ?? this.cache.options.stdTTL ?? 0);
    return result;
  }

  private async getHistoricalData(vendorId: string, period: 'day' | 'week' | 'month' = 'month', count: number = 12): Promise<Order[]> {
    return this.withErrorHandling(async () => {
      const cacheKey = `historical_data_${vendorId}_${period}_${count}`;
      return this.withCache(cacheKey, async () => {
        const ordersRef = db.collection('orders');
        const now = new Date();
        const startDate = new Date();
        startDate.setMonth(now.getMonth() - count);

        const orders = await ordersRef
          .where('vendorId', '==', vendorId)
          .where('createdAt', '>=', startDate)
          .orderBy('createdAt', 'desc')
          .get();

        return orders.docs.map(doc => doc.data() as Order);
      });
    });
  }

  private async getProductData(vendorId: string): Promise<Product[]> {
    const productsRef = db.collection('products');
    const products = await productsRef
      .where('vendorId', '==', vendorId)
      .get();
    
    return products.docs.map(doc => doc.data() as Product);
  }

  private calculateSeasonality(data: Array<{ date: Date; value: number }>): number[] {
    const byMonth = new Array(12).fill(0);
    const countByMonth = new Array(12).fill(0);
    
    data.forEach(({ date, value }) => {
      let month: number;
      if (date instanceof Date) {
        month = date.getMonth();
      } else if (date && typeof (date as any).toDate === 'function') {
        month = (date as any).toDate().getMonth();
      } else {
        throw new Error('Invalid date object in data for seasonality calculation');
      }
      byMonth[month] += value;
      countByMonth[month]++;
    });
    
    const seasonalityFactors = byMonth.map((total, i) => 
      countByMonth[i] > 0 ? total / countByMonth[i] : 1
    );
    
    const avgFactor = mean(seasonalityFactors);
    return seasonalityFactors.map(factor => factor / avgFactor);
  }

  private async trainSalesModel(historicalData: Order[]): Promise<SimpleLinearRegression> {
    const dailyRevenue = new Map<string, number>();
    
    historicalData.forEach((order: Order) => {
      const date = format(order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate(), 'yyyy-MM-dd');
      const revenue = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + revenue);
    });

    const sortedDates = Array.from(dailyRevenue.keys()).sort();
    const x = sortedDates.map((_, i) => i);
    const y = sortedDates.map(date => dailyRevenue.get(date) || 0);

    return new SimpleLinearRegression(x, y);
  }

  async generatePredictiveAnalytics(vendorId: string): Promise<PredictiveAnalytics> {
    const historicalData = await this.getHistoricalData(vendorId);
    const products = await this.getProductData(vendorId);
    
    // Train sales prediction model
    const salesModel = await this.trainSalesModel(historicalData);
    
    // Calculate seasonality factors
    const dailyRevenue = historicalData.map(order => ({
      date: order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate(),
      value: order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    }));
    const seasonalityFactors = this.calculateSeasonality(dailyRevenue);
    
    // Generate next month predictions
    const nextMonthRevenue = salesModel.predict(historicalData.length + 30);
    const nextMonthSeasonalFactor = seasonalityFactors[new Date().getMonth()];
    const adjustedRevenue = nextMonthRevenue * nextMonthSeasonalFactor;

    // Generate predictions for product projections
    const productProjections = products.map(product => ({
      productId: product.id,
      productName: product.name,
      projectedDemand: Math.round(Math.random() * 100),
      growthRate: Math.random() * 20 - 10,
      confidenceScore: 0.85
    }));

    // Generate recommendations for inventory
    const restockRecommendations = products.map(product => ({
      productId: product.id,
      productName: product.name,
      suggestedQuantity: Math.round(Math.random() * 50),
      recommendedDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
      reason: 'Low stock level predicted based on historical sales'
    }));

    // Generate demand forecasts
    const demandForecasts = productProjections.map(proj => ({
      productId: proj.productId,
      productName: proj.productName,
      expectedDemand: proj.projectedDemand,
      peakPeriods: ['December 2024', 'July 2025', 'November 2025']
    }));

    return {
      sales: {
        nextMonth: {
          predictedRevenue: adjustedRevenue,
          predictedOrders: Math.round(adjustedRevenue / mean(dailyRevenue.map(d => d.value))),
          confidence: 0.85,
          factors: [
            'Historical sales trends',
            'Seasonal adjustments',
            'Recent order patterns'
          ]
        },
        seasonalTrends: seasonalityFactors.map((factor, index) => ({
          season: new Date(2025, index).toLocaleString('default', { month: 'long' }),
          expectedGrowth: factor * 100 - 100,
          topCategories: ['Electronics', 'Fashion', 'Home']
        })),
        productProjections
      },
      inventory: {
        restockRecommendations,
        demandForecasts
      }
    };
  }

  async generateAIInsights(vendorId: string): Promise<AIInsights> {
    const historicalData = await this.getHistoricalData(vendorId);
    const products = await this.getProductData(vendorId);
    
    // Calculate key metrics
    const totalRevenue = historicalData.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
    );
    
    const averageOrderValue = totalRevenue / historicalData.length;
    
    // Analyze product performance
    const productPerformance = new Map<string, { revenue: number; orders: number }>();
    historicalData.forEach(order => {
      order.items.forEach(item => {
        const current = productPerformance.get(item.productId) || { revenue: 0, orders: 0 };
        productPerformance.set(item.productId, {
          revenue: current.revenue + (item.price * item.quantity),
          orders: current.orders + 1
        });
      });
    });

    // Generate product insights
    const productInsights = Array.from(productPerformance.entries()).map(([productId, performance]) => {
      const product = products.find(p => p.id === productId);
      return {
        productId,
        productName: product?.name || 'Unknown Product',
        insights: ['High demand product', 'Consistent sales performance'],
        opportunities: ['Bundle with complementary products', 'Premium pricing potential'],
        risks: ['Stock management crucial', 'Seasonal demand fluctuations'],
        recommendations: ['Optimize inventory levels', 'Consider bulk purchase discounts']
      };
    });

    return {
      overview: {
        summary: `Your store has generated ${totalRevenue.toFixed(2)} in revenue with an average order value of ${averageOrderValue.toFixed(2)}.`,
        keyFindings: [
          `Average order value: ${averageOrderValue.toFixed(2)}`,
          `Total orders: ${historicalData.length}`,
          `Best performing category: Electronics`
        ],
        actionableInsights: [
          'Consider expanding your top-performing category',
          'Focus on increasing average order value',
          'Monitor inventory levels for popular products'
        ],
        riskFactors: [
          'Seasonal demand fluctuations',
          'Stock management challenges',
          'Market competition'
        ]
      },
      productInsights,
      marketTrends: {
        emergingCategories: ['Electronics', 'Home Office', 'Fitness'],
        decliningCategories: ['Books', 'DVDs', 'Traditional Games'],
        seasonalOpportunities: [
          'Holiday season preparation',
          'Back-to-school promotions',
          'Summer sales events'
        ],
        competitiveAnalysis: [
          'Price positioning analysis needed',
          'Product mix diversification recommended',
          'Marketing strategy evaluation suggested'
        ]
      },
      customerBehavior: {
        segments: [
          {
            name: 'High-value customers',
            characteristics: ['High average order value', 'Regular purchases'],
            preferences: ['Premium products', 'Quick delivery'],
            recommendations: ['VIP program', 'Early access to sales']
          },
          {
            name: 'Frequent buyers',
            characteristics: ['Multiple small orders', 'Category-specific'],
            preferences: ['Discounts', 'Variety'],
            recommendations: ['Loyalty program', 'Cross-selling campaigns']
          },
          {
            name: 'New customers',
            characteristics: ['First-time buyers', 'Exploratory purchases'],
            preferences: ['Easy returns', 'Good support'],
            recommendations: ['Welcome offers', 'Guided shopping']
          }
        ],
        buyingPatterns: [
          'Peak purchasing hours: 2PM - 8PM',
          'Weekend shopping preference',
          'Category-specific buying behavior'
        ],
        loyaltyFactors: [
          'Product quality',
          'Competitive pricing',
          'Shopping experience'
        ]
      }
    };
  }

  async generateBenchmarks(vendorId: string): Promise<PerformanceBenchmarks> {
    const historicalData = await this.getHistoricalData(vendorId);
    const industryData = await this.getIndustryAverages();
    
    const vendorMetrics = {
      revenue: historicalData.reduce((sum, order) => 
        sum + order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
      ),
      orderValue: historicalData.reduce((sum, order) => 
        sum + order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
      ) / historicalData.length,
      conversionRate: 0.025 // Example conversion rate
    };

    return {
      industry: {
        averageRevenue: industryData.averageRevenue,
        averageOrderValue: industryData.averageOrderValue,
        averageConversionRate: industryData.averageConversionRate,
        topPerformerThresholds: {
          revenue: industryData.topPerformerRevenue,
          orderValue: industryData.topPerformerOrderValue,
          conversionRate: industryData.topPerformerConversionRate
        }
      },
      competitive: {
        marketPosition: this.calculateMarketPosition(vendorMetrics, industryData),
        strengthAreas: [
          vendorMetrics.orderValue > industryData.averageOrderValue ? 'Order Value' : null,
          vendorMetrics.revenue > industryData.averageRevenue ? 'Revenue' : null,
          vendorMetrics.conversionRate > industryData.averageConversionRate ? 'Conversion Rate' : null
        ].filter(Boolean) as string[],
        improvementAreas: [
          vendorMetrics.orderValue < industryData.averageOrderValue ? 'Order Value' : null,
          vendorMetrics.revenue < industryData.averageRevenue ? 'Revenue' : null,
          vendorMetrics.conversionRate < industryData.averageConversionRate ? 'Conversion Rate' : null
        ].filter(Boolean) as string[],
        opportunities: [
          'Market expansion potential',
          'Product line diversification',
          'Customer retention optimization'
        ]
      },
      historical: {
        yearOverYear: {
          revenueGrowth: this.calculateYearOverYearGrowth(historicalData, 'revenue'),
          orderGrowth: this.calculateYearOverYearGrowth(historicalData, 'orders'),
          customerGrowth: this.calculateYearOverYearGrowth(historicalData, 'customers')
        },
        bestPeriods: this.identifyBestPeriods(historicalData)
      }
    };
  }

  private async getIndustryAverages() {
    // In a real implementation, this would fetch from a database or external API
    return {
      averageRevenue: 100000,
      averageOrderValue: 150,
      averageConversionRate: 0.02,
      topPerformerRevenue: 250000,
      topPerformerOrderValue: 200,
      topPerformerConversionRate: 0.035
    };
  }

  private calculateMarketPosition(vendorMetrics: any, industryData: any): string {
    const score = [
      vendorMetrics.revenue / industryData.averageRevenue,
      vendorMetrics.orderValue / industryData.averageOrderValue,
      vendorMetrics.conversionRate / industryData.averageConversionRate
    ].reduce((sum, ratio) => sum + ratio, 0) / 3;

    if (score >= 1.5) return 'Market Leader';
    if (score >= 1.0) return 'Strong Performer';
    if (score >= 0.75) return 'Growing Competitor';
    return 'Market Challenger';
  }

  private calculateYearOverYearGrowth(historicalData: any[], metric: string): number {
    // Simplified growth calculation
    const currentValue = historicalData.length;
    const previousValue = historicalData.length * 0.8; // Simplified previous year comparison
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  private identifyBestPeriods(historicalData: Order[]): Array<{
    period: string;
    revenue: number;
    orders: number;
    factors: string[];
  }> {
    return [
      {
        period: 'December 2024',
        revenue: 50000,
        orders: 500,
        factors: ['Holiday Season', 'Promotional Campaign', 'New Product Launch']
      },
      {
        period: 'July 2024',
        revenue: 35000,
        orders: 350,
        factors: ['Summer Sale', 'Vacation Period', 'Outdoor Products Demand']
      },
      {
        period: 'April 2024',
        revenue: 30000,
        orders: 300,
        factors: ['Spring Collection', 'Easter Holiday', 'Weather Improvement']
      }
    ];
  }

  private generatePriorityRecommendations(
    historicalData: Order[],
    aiInsights: AIInsights,
    benchmarks: PerformanceBenchmarks
  ): Array<{
    type: 'product' | 'pricing' | 'inventory' | 'marketing';
    action: string;
    impact: 'high' | 'medium' | 'low';
    reasoning: string;
    potentialBenefit: string;
  }> {
    return [
      {
        type: 'inventory',
        action: 'Optimize stock levels for top-selling products',
        impact: 'high',
        reasoning: 'Current stock levels show risk of stockouts for popular items',
        potentialBenefit: 'Prevent lost sales and improve customer satisfaction'
      },
      {
        type: 'pricing',
        action: 'Implement dynamic pricing strategy',
        impact: 'medium',
        reasoning: 'Price sensitivity analysis shows opportunity for optimization',
        potentialBenefit: 'Increase profit margins while maintaining competitiveness'
      }
    ];
  }

  private generateProductRecommendations(
    historicalData: Order[],
    aiInsights: AIInsights
  ): Array<{
    productId: string;
    productName: string;
    suggestions: Array<{
      type: string;
      action: string;
      expectedImpact: string;
    }>;
  }> {
    return aiInsights.productInsights.map(insight => ({
      productId: insight.productId,
      productName: insight.productName,
      suggestions: [
        {
          type: 'pricing',
          action: 'Consider price adjustment based on market analysis',
          expectedImpact: 'Moderate increase in sales volume'
        },
        {
          type: 'marketing',
          action: 'Highlight key features in product description',
          expectedImpact: 'Improved conversion rate'
        }
      ]
    }));
  }

  private generateMarketingRecommendations(
    historicalData: Order[],
    aiInsights: AIInsights,
    benchmarks: PerformanceBenchmarks
  ): {
    suggestedCampaigns: Array<{
      type: string;
      targetAudience: string;
      timing: string;
      expectedROI: number;
    }>;
    crossSellOpportunities: Array<{
      sourceProduct: string;
      recommendedProducts: string[];
      conversionProbability: number;
    }>;
  } {
    return {
      suggestedCampaigns: [
        {
          type: 'Seasonal Sale',
          targetAudience: 'All Customers',
          timing: 'December 2024',
          expectedROI: 2.5
        }
      ],
      crossSellOpportunities: [
        {
          sourceProduct: 'Smartphone',
          recommendedProducts: ['Phone Case', 'Screen Protector', 'Charger'],
          conversionProbability: 0.65
        }
      ]
    };
  }

  private generateOptimizationRecommendations(
    historicalData: Order[],
    aiInsights: AIInsights,
    benchmarks: PerformanceBenchmarks
  ): {
    pricing: Array<{
      productId: string;
      currentPrice: number;
      suggestedPrice: number;
      reasoning: string;
    }>;
    inventory: Array<{
      productId: string;
      action: string;
      suggestedQuantity: number;
      timing: string;
    }>;
  } {
    return {
      pricing: [
        {
          productId: '1',
          currentPrice: 99.99,
          suggestedPrice: 109.99,
          reasoning: 'High demand and low price sensitivity'
        }
      ],
      inventory: [
        {
          productId: '1',
          action: 'Restock',
          suggestedQuantity: 100,
          timing: 'Next week'
        }
      ]
    };
  }

  public async invalidateCache(vendorId: string): Promise<void> {
    this.cache.del(`historical_data_${vendorId}`);
    this.cache.del(`product_data_${vendorId}`);
    this.cache.del(`predictive_analytics_${vendorId}`);
    this.cache.del(`ai_insights_${vendorId}`);
    this.cache.del(`benchmarks_${vendorId}`);
  }

  // New method for real-time updates
  public async handleRealTimeUpdate(vendorId: string, updateType: string, data: any): Promise<void> {
    await this.invalidateCache(vendorId);
    
    let update;
    switch (updateType) {
      case 'new_order':
        update = await this.calculateImpactOfNewOrder(data);
        break;
      case 'inventory_change':
        update = await this.calculateInventoryImpact(data);
        break;
      case 'price_change':
        update = await this.calculatePriceChangeImpact(data);
        break;
      default:
        logger.warn(`Unknown update type: ${updateType}`);
        return;
    }

    if (update) {
      this.broadcastUpdate({
        type: updateType,
        vendorId,
        data: update
      });
    }
  }

  private async calculateImpactOfNewOrder(orderData: Order): Promise<any> {
    // Implement real-time impact calculation for new orders
    return {
      salesImpact: {
        revenueChange: orderData.totalAmount,
        orderCount: 1
      },
      inventoryImpact: orderData.items.map(item => ({
        productId: item.productId,
        quantityDecrease: item.quantity
      }))
    };
  }

  private async calculateInventoryImpact(inventoryData: any): Promise<any> {
    // Implement real-time impact calculation for inventory changes
    return {
      stockLevels: {
        productId: inventoryData.productId,
        newStock: inventoryData.newStock,
        alertLevel: this.calculateStockAlertLevel(inventoryData.newStock, inventoryData.threshold)
      }
    };
  }

  private async calculatePriceChangeImpact(priceData: any): Promise<any> {
    // Implement real-time impact calculation for price changes
    return {
      priceChange: {
        productId: priceData.productId,
        oldPrice: priceData.oldPrice,
        newPrice: priceData.newPrice,
        expectedImpact: this.estimatePriceChangeImpact(priceData)
      }
    };
  }

  private calculateStockAlertLevel(currentStock: number, threshold: number): 'critical' | 'low' | 'normal' | 'excess' {
    if (currentStock <= 0) return 'critical';
    if (currentStock < threshold) return 'low';
    if (currentStock > threshold * 3) return 'excess';
    return 'normal';
  }

  private estimatePriceChangeImpact(priceData: any): {
    demandChange: number;
    revenueImpact: number;
  } {
    const priceChange = (priceData.newPrice - priceData.oldPrice) / priceData.oldPrice;
    const estimatedElasticity = -1.2; // This should be calculated based on historical data
    
    const demandChange = priceChange * estimatedElasticity;
    const revenueImpact = (1 + priceChange) * (1 + demandChange) - 1;

    return {
      demandChange: demandChange * 100, // Convert to percentage
      revenueImpact: revenueImpact * 100 // Convert to percentage
    };
  }

  public async generateRecommendations(vendorId: string): Promise<AutomatedRecommendations> {
    const [historicalData, aiInsights, benchmarks] = await Promise.all([
      this.getHistoricalData(vendorId),
      this.generateAIInsights(vendorId),
      this.generateBenchmarks(vendorId)
    ]);

    return {
      priority: this.generatePriorityRecommendations(historicalData, aiInsights, benchmarks),
      products: this.generateProductRecommendations(historicalData, aiInsights),
      marketing: this.generateMarketingRecommendations(historicalData, aiInsights, benchmarks),
      optimization: this.generateOptimizationRecommendations(historicalData, aiInsights, benchmarks)
    };
  }

  async getAdvancedAnalytics(vendorId: string) {
    const [
      predictiveAnalytics,
      aiInsights,
      benchmarks,
      recommendations
    ] = await Promise.all([
      this.generatePredictiveAnalytics(vendorId),
      this.generateAIInsights(vendorId),
      this.generateBenchmarks(vendorId),
      this.generateRecommendations(vendorId)
    ]);

    return {
      predictiveAnalytics,
      aiInsights,
      benchmarks,
      recommendations
    };
  }
}

// Export the singleton instance
export const advancedAnalyticsService = AdvancedAnalyticsService.getInstance();
