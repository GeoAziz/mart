/**
 * Analytics Contracts and Types for Google Analytics 4 (GA4) Integration.
 * Defines shared interfaces for client tracking, server Measurement Protocol,
 * consent snapshots, attribution context, and the transactional outbox.
 */

// ────────────────────────────────────────────────────────────
// Consent & Attribution Contracts
// ────────────────────────────────────────────────────────────

export type ConsentStatus = 'granted' | 'denied' | 'unknown' | 'revoked';

export interface ConsentSnapshot {
  analyticsStorage: 'granted' | 'denied';
  consentTimestamp: string; // ISO 8601 string
  policyVersion: string; // e.g., "2026.1"
  source: 'cookie_banner' | 'user_account_settings' | 'default_denied';
}

export interface AttributionContext {
  clientId: string | null; // Extracted via gtag or _ga cookie (e.g., "123456789.1700000000")
  sessionId: number | null; // Extracted numeric integer timestamp from _ga_<CONTAINER_ID>
  capturedAt: string; // ISO 8601 string
  consentSnapshot: ConsentSnapshot;
}

// ────────────────────────────────────────────────────────────
// GA4 E-Commerce Item & Event Schemas
// ────────────────────────────────────────────────────────────

export interface GA4Item {
  item_id: string;
  item_name: string;
  price: number; // Floating-point major unit (e.g. 150.00 KES)
  quantity: number;
  item_category?: string;
  item_brand?: string;
  vendor_id?: string;
}

export interface GA4PurchasePayload {
  client_id: string; // Required for web Measurement Protocol
  session_id?: number; // Optional numeric session timestamp
  user_id?: string; // Optional authenticated user UID
  events: [
    {
      name: 'purchase';
      params: {
        transaction_id: string; // Authoritative order.id
        value: number; // Sum of (item.price * item.quantity), EXCLUDING shipping & tax
        currency: string; // Authoritative currency, e.g. "KES" or "USD"
        shipping?: number;
        tax?: number;
        payment_method?: string; // e.g. "mpesa", "stripe", "paypal"
        shipping_county?: string;
        items: GA4Item[];
        is_synthetic?: number;
        traffic_type?: string;
      };
    }
  ];
}

export interface GA4RefundPayload {
  client_id: string; // Required for web Measurement Protocol
  session_id?: number;
  user_id?: string;
  events: [
    {
      name: 'refund';
      params: {
        transaction_id: string; // Authoritative order.id
        value: number; // Refunded amount
        currency: string;
        shipping?: number;
        tax?: number;
        items?: GA4Item[];
        is_synthetic?: number;
        traffic_type?: string;
      };
    }
  ];
}

// ────────────────────────────────────────────────────────────
// Transactional Outbox Schema (Firestore: analytics_outbox)
// ────────────────────────────────────────────────────────────

export type OutboxStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'suppressed'
  | 'dead_letter';

export type SuppressionReason =
  | 'consent_denied'
  | 'missing_client_id'
  | 'consent_revoked'
  | 'policy_suppression';

export interface AnalyticsOutboxRecord {
  id: string; // Format: `${orderId}_${eventType}`
  orderId: string;
  eventType: 'purchase' | 'refund';
  status: OutboxStatus;
  suppressionReason?: SuppressionReason;
  attemptCount: number; // Incremented strictly when network dispatch is executed
  maxAttempts: number; // Default 5
  nextAttemptAt: any; // Firestore Timestamp
  lockedAt: any | null; // Firestore Timestamp
  lockedBy: string | null; // Worker instance identifier
  leaseExpiresAt: any | null; // Firestore Timestamp (now + 60s lease)
  leaseId: string | null; // Fencing token to prevent stale worker writes
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  sentAt?: any; // Firestore Timestamp
  lastErrorCode?: string;
  lastErrorMessage?: string;
  payload: {
    transaction_id: string;
    value: number; // Sum of items, excluding shipping and tax
    currency: string;
    shipping: number;
    tax: number;
    payment_method: string;
    shipping_county?: string;
    items: GA4Item[];
    attribution?: AttributionContext;
    is_synthetic?: number;
    traffic_type?: string;
  };
}

// ────────────────────────────────────────────────────────────
// Payment-to-Order Verification Contract
// ────────────────────────────────────────────────────────────

export interface VerifiedPaymentResult {
  provider: 'mpesa' | 'stripe' | 'paypal';
  paymentId: string; // Provider transaction / receipt reference
  orderId: string;
  amount: number; // Major currency unit, e.g. 4500.00
  currency: string; // e.g. "KES", "USD"
  providerReference?: string; // MerchantRequestID, PaymentIntentID, or CaptureID
  status: 'COMPLETED' | 'FAILED';
  verifiedAt: string; // ISO 8601
}

