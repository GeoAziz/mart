import type { Timestamp } from 'firebase-admin/firestore';
export type { Timestamp };

// From authMiddleware
export interface UserProfile {
  uid: string;
  email: string | null;
  fullName: string | null;
  role: Role;
  status: 'active' | 'pending_approval' | 'suspended';
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export type Role = 'customer' | 'vendor' | 'admin';

// Vendor-specific profile (extends UserProfile, but can be used for vendor-only data)
export interface VendorProfile extends UserProfile {
  storeName: string;
  storeDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  bannerUrl?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  payoutMpesaNumber?: string;
  // Add more vendor-specific fields as needed
}

// Admin-specific profile (can be extended in the future)
export interface AdminProfile extends UserProfile {
  // Add admin-specific fields if needed
}

// Customer/client-specific profile (can be extended in the future)
export interface CustomerProfile extends UserProfile {
  // Add customer-specific fields if needed
}

// New Category Type
export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// From products/route.ts
export type ProductStatus = 'pending_approval' | 'active' | 'rejected' | 'draft';
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  stock?: number;
  lowStockThreshold?: number;
  imageUrl?: string;
  additionalImageUrls?: string[];
  brand?: string;
  dateAdded?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  dataAiHint?: string;
  vendorId?: string;
  status: ProductStatus;
  sku?: string;
  rating?: number;
}

// From orders/route.ts
export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number; // Price per item at time of purchase
  imageUrl?: string;
  dataAiHint?: string;
  vendorId?: string;
  refundStatus?: 'none' | 'requested' | 'approved'; // Track refund status per item
}
export interface ShippingAddress {
  fullName: string;
  address: string;
  city: string;
  postalCode?: string;
  phone: string;
}
export type OrderStatus = 
  | 'pending'       // Initial state when order is created
  | 'processing'    // Payment confirmed, being prepared
  | 'shipped'       // Order has been shipped
  | 'out_for_delivery' // With delivery agent
  | 'delivered'     // Successfully delivered
  | 'cancelled'     // Cancelled by customer or vendor
  | 'refunded'      // Fully refunded
  | 'partially_refunded'; // Some items refunded

export interface OrderTracking {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
  location?: string;
  updatedBy?: string;
}

export interface Order {
  id?: string;
  userId: string;
  userFullName: string | null;
  userEmail: string | null;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentDetails?: Record<string, any>; 
  status: OrderStatus;
  statusHistory: OrderTracking[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  vendorIds?: string[];
  // New promotion fields
  promotionCode?: string;
  discountAmount?: number;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  trackingNumber?: string;
  courierName?: string;
}

// From refunds/route.ts
export interface RefundRequest {
  id?: string;
  orderId: string;
  productId: string; // ID of the product being refunded
  productName: string; // Denormalized
  productImageUrl?: string; // Denormalized
  dataAiHint?: string; // Denormalized

  userId: string; // Customer's UID
  customerName: string; // Denormalized customer name
  customerEmail: string; // Denormalized customer email

  vendorId?: string; // UID of the vendor if it's a vendor product

  reason: string;
  requestedAmount: number; // Amount for the item(s) being refunded
  status: 'Pending' | 'Approved' | 'Denied' | 'Processing';
  requestedAt: Timestamp | Date;
  processedAt?: Timestamp | Date;
  adminNotes?: string;
  transactionId?: string; // For refund transaction, if applicable
}

// From vendors/me/payouts/route.ts
export interface Payout {
  id: string;
  vendorId: string;
  date: Date; // Should be the same as requestedAt for new requests
  amount: number;
  status: 'Pending' | 'Completed' | 'Failed';
  method: string;
  transactionId?: string;
  requestedAt: Date;
  processedAt?: Date;
  adminNotes?: string;
}

// New Ledger System Type
export interface LedgerEntry {
  vendorId: string;
  type: 'sale_credit' | 'refund_debit' | 'payout_debit' | 'payout_failed_reversal' | 'adjustment_credit' | 'adjustment_debit';
  amount: number; // The gross amount of the transaction (always positive)
  commissionRate?: number; // The rate at time of transaction (e.g., 0.10 for 10%)
  commissionAmount?: number; // The absolute value of commission deducted (always positive)
  netAmount: number; // The final amount credited (positive) or debited (negative) to the vendor's balance
  orderId?: string;
  productId?: string;
  payoutId?: string;
  refundId?: string;
  createdAt: Timestamp | Date;
  description: string;
}

// New Promotion System Type
export interface Promotion {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  isActive: boolean;
  startDate: Timestamp | Date;
  endDate?: Timestamp | Date;
  usageLimit?: number; // Max number of times this can be used in total
  timesUsed: number;
  minPurchaseAmount?: number; // Minimum cart subtotal to apply
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface AppliedPromotion extends Promotion {
    discountAmount: number;
}

// Wishlist System Types
export interface WishlistItemClient {
  id: string;
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  addedAt: Timestamp | Date;
}

// Address System Types
export interface Address {
  id?: string;
  userId: string;
  fullName: string;
  address: string;
  city: string;
  postalCode?: string;
  phone: string;
  isDefault?: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// Messaging System Types
export interface Conversation {
  id?: string; // Firestore document ID
  participants: string[]; // array of UIDs
  participantNames: { [key: string]: string }; // e.g., { uid1: 'Alice', uid2: 'Bob' }
  participantAvatars: { [key: string]: string };
  lastMessage: {
    text: string;
    timestamp: Timestamp | Date;
    senderId: string;
  };
  relatedTo: { // Context for the conversation
    type: 'order' | 'product' | 'general';
    id: string; // Order ID or Product ID
    text: string; // e.g., "Order #ORD123" or "Product: Cybernetic Arm"
  };
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  readBy: string[]; // array of UIDs who have read the latest message
}

export interface Message {
  id?: string; // Firestore document ID
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: Timestamp | Date;
}

// Inventory Types
export interface InventoryUpdateItem {
  productId: string;
  stockQuantity: number;
  lastStockUpdate: Date;
  lowStockThreshold?: number;
  lastRestockDate?: Date;
  reorderPoint?: number;
  notes?: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  movementType: 'restock' | 'adjustment' | 'sale';
  associatedOrderId?: string;
}

export interface InventoryHistory {
  id?: string;
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  changeType: 'increase' | 'decrease' | 'adjustment' | 'sale';
  reason?: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface ProductInventorySettings {
  productId: string;
  lowStockThreshold: number;
  notificationsEnabled: boolean;
  autoReorderPoint?: number;
  autoReorderQuantity?: number;
  lastNotificationSent?: Date;
}

// New Review System Type
export interface Review {
    id?: string;
    productId: string;
    productName?: string;
    userId: string;
    userName: string;
    userEmail: string;
    rating: number;
    comment: string;
    createdAt: Timestamp | Date;
    reply?: string;
    repliedAt?: Timestamp | Date;
    customerAvatar?: string;
    customerInitials?: string;
}

// Updated VendorSettings interface
export interface VendorSettings {
  storeName?: string;
  storeDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  bannerUrl?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  payoutMpesaNumber?: string;
  reviewNotifications?: boolean;
  useAutoReply?: boolean;
  autoReplyMessage?: string;
  updatedAt?: Timestamp | Date;
}

// New Analytics and Logging Types
export interface VendorAnalytics {
  storeViews: {
    total: number;
    unique: number;
    bounceRate: number;
    avgTimeSpent: number;
  };
  productViews: {
    total: number;
    unique: number;
    conversionRate: number;
  };
  customerMetrics: {
    total: number;
    returning: number;
    avgOrderValue: number;
  };
  lastUpdated: Timestamp | Date;
}

export interface InventoryLog {
  productId: string;
  type: 'restock' | 'adjustment' | 'sale';
  quantity: number;
  notes: string;
  timestamp: Timestamp | Date;
}

export interface DashboardData {
  totalAllTimeEarnings: number;
  currentBalance: number;
  lastPayoutAmount: number | null;
  lastPayoutDate: string | null;
  earningsChartData: { month: string; earnings: number }[];
  totalOrders: number;
  totalProducts: number;
  totalReviews: number;
  avgRating: number;
  bestSellingProducts?: { name: string; sales: number }[];
  recentReviews: Array<{
    id: string;
    productId: string;
    productName: string;
    rating: number;
    comment: string;
    customerName: string;
    customerAvatar?: string;
    createdAt: Date;
    reply?: string;
  }>;
  recentOrders: Array<{
    id: string;
    status: string;
    total: number;
    createdAt: Date;
  }>;
}

export interface ProductAnalytics {
  productId: string;
  productName: string;
  salesMetrics: {
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalQuantitySold: number;
    salesByMonth: { month: string; sales: number; revenue: number }[];
  };
  inventoryMetrics: {
    currentStock: number;
    restockFrequency: number; // Average days between restocks
    turnoverRate: number; // Sales velocity
    stockoutCount: number; // Number of times product went out of stock
  };
  performanceMetrics: {
    conversionRate: number; // Percentage of views that led to sales
    views: number;
    uniqueViewers: number;
    addToCartCount: number;
    wishlistCount: number;
  };
  categoryRanking: {
    rank: number;
    totalProductsInCategory: number;
    percentileInCategory: number;
  };
  lastUpdated: Timestamp | Date;
}

// New enhanced analytics types
export interface SalesMetrics {
  daily: {
    date: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
    uniqueCustomers: number;
  }[];
  weekly: {
    weekStart: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
    uniqueCustomers: number;
  }[];
  monthly: {
    month: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
    uniqueCustomers: number;
    topProducts: Array<{
      id: string;
      name: string;
      sales: number;
      revenue: number;
    }>;
  }[];
}

export interface ProductPerformanceMetrics {
  id: string;
  name: string;
  metrics: {
    views: number;
    uniqueViews: number;
    purchases: number;
    revenue: number;
    conversionRate: number;
    averageRating: number;
    reviewCount: number;
    inventory: {
      current: number;
      incoming: number;
      reorderPoint: number;
      turnoverRate: number;
      daysToStockout: number | null;
      restockPrediction: {
        suggestedQuantity: number;
        suggestedDate: Date;
      };
    };
    trends: {
      viewsTrend: number;
      salesTrend: number;
      ratingTrend: number;
    };
  };
  historicalData: {
    date: string;
    views: number;
    sales: number;
    revenue: number;
  }[];
}

export interface CategoryAnalytics {
  id: string;
  name: string;
  metrics: {
    totalRevenue: number;
    totalSales: number;
    averageOrderValue: number;
    productCount: number;
    topProducts: Array<{
      id: string;
      name: string;
      sales: number;
      revenue: number;
    }>;
    growth: {
      revenue: number;
      sales: number;
      products: number;
    };
    trends: {
      daily: Array<{ date: string; revenue: number; sales: number }>;
      weekly: Array<{ week: string; revenue: number; sales: number }>;
      monthly: Array<{ month: string; revenue: number; sales: number }>;
    };
  };
}

// Add to the types.ts file
export interface CategoryMetric {
  id: string;
  name: string;
  units: number;
  revenue: number;
  growth: number;
}

export interface InventoryAlerts {
  id: string;
  productId: string;
  productName: string;
  type: 'low_stock' | 'out_of_stock' | 'reorder_suggested' | 'overstock';
  currentStock: number;
  reorderPoint: number;
  suggestedAction: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
}

export interface PredictiveAnalytics {
  sales: {
    nextMonth: {
      predictedRevenue: number;
      predictedOrders: number;
      confidence: number;
      factors: string[];
    };
    seasonalTrends: Array<{
      season: string;
      expectedGrowth: number;
      topCategories: string[];
    }>;
    productProjections: Array<{
      productId: string;
      productName: string;
      projectedDemand: number;
      growthRate: number;
      confidenceScore: number;
    }>;
  };
  inventory: {
    restockRecommendations: Array<{
      productId: string;
      productName: string;
      suggestedQuantity: number;
      recommendedDate: Date;
      reason: string;
    }>;
    demandForecasts: Array<{
      productId: string;
      productName: string;
      expectedDemand: number;
      peakPeriods: string[];
    }>;
  };
}

export interface AIInsights {
  overview: {
    summary: string;
    keyFindings: string[];
    actionableInsights: string[];
    riskFactors: string[];
  };
  productInsights: Array<{
    productId: string;
    productName: string;
    insights: string[];
    opportunities: string[];
    risks: string[];
    recommendations: string[];
  }>;
  marketTrends: {
    emergingCategories: string[];
    decliningCategories: string[];
    seasonalOpportunities: string[];
    competitiveAnalysis: string[];
  };
  customerBehavior: {
    segments: Array<{
      name: string;
      characteristics: string[];
      preferences: string[];
      recommendations: string[];
    }>;
    buyingPatterns: string[];
    loyaltyFactors: string[];
  };
}

export interface PerformanceBenchmarks {
  industry: {
    averageRevenue: number;
    averageOrderValue: number;
    averageConversionRate: number;
    topPerformerThresholds: {
      revenue: number;
      orderValue: number;
      conversionRate: number;
    };
  };
  competitive: {
    marketPosition: string;
    strengthAreas: string[];
    improvementAreas: string[];
    opportunities: string[];
  };
  historical: {
    yearOverYear: {
      revenueGrowth: number;
      orderGrowth: number;
      customerGrowth: number;
    };
    bestPeriods: Array<{
      period: string;
      revenue: number;
      orders: number;
      factors: string[];
    }>;
  };
}

export interface AutomatedRecommendations {
  priority: Array<{
    type: 'pricing' | 'inventory' | 'marketing' | 'product';
    action: string;
    impact: 'high' | 'medium' | 'low';
    reasoning: string;
    potentialBenefit: string;
  }>;
  products: Array<{
    productId: string;
    productName: string;
    suggestions: Array<{
      type: string;
      action: string;
      expectedImpact: string;
    }>;
  }>;
  marketing: {
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
  };
  optimization: {
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
  };
}

// Update AnalyticsDashboard interface to include new advanced features
export interface AnalyticsDashboard extends DashboardData {
  salesPerformance: SalesMetrics;
  topProducts: ProductPerformanceMetrics[];
  categoryInsights: CategoryAnalytics[];
  inventoryAlerts: InventoryAlerts[];
  performanceSummary: {
    currentPeriod: {
      revenue: number;
      orders: number;
      averageOrderValue: number;
      conversionRate: number;
    };
    previousPeriod: {
      revenue: number;
      orders: number;
      averageOrderValue: number;
      conversionRate: number;
    };
    trends: {
      revenue: number;
      orders: number;
      averageOrderValue: number;
      conversionRate: number;
    };
  };
  predictiveAnalytics: PredictiveAnalytics;
  aiInsights: AIInsights;
  benchmarks: PerformanceBenchmarks;
  recommendations: AutomatedRecommendations;
}
