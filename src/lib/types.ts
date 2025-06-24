

import type { Timestamp } from 'firebase-admin/firestore';

// From authMiddleware
export interface UserProfile {
  uid: string;
  email: string | null;
  fullName: string | null;
  role: 'customer' | 'vendor' | 'admin';
  status: 'active' | 'pending_approval' | 'suspended';
  createdAt: Timestamp | Date; 
  updatedAt?: Timestamp | Date;
}
export type Role = UserProfile['role'];

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
export interface Order {
  id?: string;
  userId: string;
  userFullName: string | null;
  userEmail: string | null;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentDetails?: Record<string, any>; 
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
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
