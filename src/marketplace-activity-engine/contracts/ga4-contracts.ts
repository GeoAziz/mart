/**
 * Full-Funnel GA4 E-Commerce, Lead Generation & Marketplace Contracts (v1.2).
 * Strictly defines schemas for all standard e-commerce events, B2B lead lifecycle events,
 * B2C shopper acquisition events, top-level user_location, and canonical identity contracts.
 */

import { GA4UserLocation } from '../adapters/ga4-location-adapter';

// ────────────────────────────────────────────────────────────
// 1. Standard GA4 Event Names
// ────────────────────────────────────────────────────────────

export type StandardGA4EcommerceEventName =
  | 'view_item_list'
  | 'select_item'
  | 'view_promotion'
  | 'select_promotion'
  | 'view_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'add_shipping_info'
  | 'add_payment_info'
  | 'purchase'
  | 'refund';

export type StandardGA4EventName = StandardGA4EcommerceEventName;

export type GA4LeadEventName =
  | 'generate_lead'
  | 'working_lead'
  | 'qualify_lead'
  | 'disqualify_lead'
  | 'close_convert_lead'
  | 'close_unconvert_lead';

export type GA4UserAuthEventName =
  | 'sign_up'
  | 'login';

export type AllGA4EventName =
  | StandardGA4EcommerceEventName
  | GA4LeadEventName
  | GA4UserAuthEventName;

// ────────────────────────────────────────────────────────────
// 2. Canonical Identity & Attribution Contracts
// ────────────────────────────────────────────────────────────

export type ConsentState = 'granted' | 'denied';

export interface AnalyticsIdentity {
  clientId: string;            // Web Measurement Protocol format: '<uint32>.<epoch>'
  sessionId?: number;          // Monotonic Unix epoch in seconds
  sessionNumber?: number;      // Monotonic session count for user
  userId?: string;             // Authenticated user ID (e.g. 'sim_uid_0042')
  identityCapturedAt: string;  // ISO-8601 timestamp
  consentState: ConsentState;
  measurementId: string;       // Allowed: 'G-YV6C8Q312S'

  attribution: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
}

export interface AcquisitionTouchpoint {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
  landingUrl: string;
  capturedAt: string;
  clientId: string;
}

export interface SessionTouchpoint {
  sessionId: number;
  source: string;
  medium: string;
  campaign?: string;
  capturedAt: string;
}

// ────────────────────────────────────────────────────────────
// 3. Standard GA4 Item Specification
// ────────────────────────────────────────────────────────────

export interface GA4StandardItem {
  item_id: string;              // Authoritative product ID: 'prod_sim_001'
  item_name: string;            // Product title: 'Sim Laptop Pro 15"'
  price: number;                // Major currency unit (e.g. 45000.00 KES)
  quantity: number;             // Positive integer
  item_category?: string;       // Primary taxonomy
  item_brand?: string;          // Brand name
  item_variant?: string;        // Color / size / spec
  affiliation?: string;         // Standard GA4 vendor affiliation
  vendor_id?: string;           // Custom item-scoped dimension
  index?: number;               // Position in list (1-based)
}

// ────────────────────────────────────────────────────────────
// 4. B2B Lead Lifecycle Event Payloads
// ────────────────────────────────────────────────────────────

export type DisqualifiedLeadReason =
  | 'failed_business_kyc'
  | 'out_of_coverage_area'
  | 'prohibited_catalog'
  | 'duplicate_store'
  | 'invalid_contact';

export type UnconvertLeadReason =
  | 'abandoned_catalog_setup'
  | 'unresponsive_merchant'
  | 'merchant_cancelled';

export interface GA4GenerateLeadParams {
  currency: 'KES';
  value: number;               // Estimated pipeline value (e.g. 15000)
  lead_source: string;         // e.g. 'facebook_cpc', 'google_organic'
  lead_type: 'vendor_onboarding' | 'wholesale_quote' | 'support_inquiry' | 'newsletter';
  session_id?: number;
  engagement_time_msec?: number;
  is_synthetic?: number;
}

export interface GA4WorkingLeadParams {
  currency: 'KES';
  value: number;
  session_id?: number;
  is_synthetic?: number;
}

export interface GA4QualifyLeadParams {
  currency: 'KES';
  value: number;
  lead_status: 'verified_merchant' | 'approved_wholesaler';
  session_id?: number;
  is_synthetic?: number;
}

export interface GA4DisqualifyLeadParams {
  disqualified_lead_reason: DisqualifiedLeadReason;
  lead_source: string;
  session_id?: number;
  is_synthetic?: number;
}

export interface GA4CloseConvertLeadParams {
  currency: 'KES';
  value: number;               // Activated merchant value (e.g. 50000)
  session_id?: number;
  is_synthetic?: number;
}

export interface GA4CloseUnconvertLeadParams {
  unconvert_lead_reason: UnconvertLeadReason;
  session_id?: number;
  is_synthetic?: number;
}

// ────────────────────────────────────────────────────────────
// 5. B2C Shopper Auth Event Payloads
// ────────────────────────────────────────────────────────────

export interface GA4SignUpParams {
  method: 'email' | 'google' | 'phone';
  user_role?: 'customer' | 'vendor';
  session_id?: number;
  is_synthetic?: number;
}

export interface GA4LoginParams {
  method: 'email' | 'google' | 'phone';
  session_id?: number;
  is_synthetic?: number;
}

// ────────────────────────────────────────────────────────────
// 6. E-Commerce Purchase & Refund Payloads
// ────────────────────────────────────────────────────────────

export interface GA4PurchaseParams {
  transaction_id: string;
  value: number;
  currency: 'KES';
  shipping?: number;
  tax?: number;
  payment_method?: string;
  shipping_county?: string;
  items: GA4StandardItem[];
  session_id?: number;
  is_synthetic?: number;
}

export interface GA4RefundParams {
  transaction_id: string;
  value: number;
  currency: 'KES';
  shipping?: number;
  items?: GA4StandardItem[];
  session_id?: number;
  is_synthetic?: number;
}

// ────────────────────────────────────────────────────────────
// 7. Generic Measurement Protocol Request Envelope
// ────────────────────────────────────────────────────────────

export interface GA4StreamEventPayload {
  client_id: string;
  user_id?: string;
  user_location?: GA4UserLocation;
  timestamp_micros?: number;
  events: Array<{
    name: string;
    params: Record<string, any>;
  }>;
}

// ────────────────────────────────────────────────────────────
// 8. Invariant Sanitization & PII Filter
// ────────────────────────────────────────────────────────────

const PROHIBITED_PARAM_KEYS = new Set([
  'email',
  'phone',
  'password',
  'kra_pin',
  'national_id',
  'vendor_payout_mpesa',
  'rejection_notes',
  'firebase_uid'
]);

export function sanitizeGA4EventParams(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    const lowerKey = key.toLowerCase();
    if (PROHIBITED_PARAM_KEYS.has(lowerKey)) {
      throw new Error(`[SECURITY_VIOLATION] Attempted to pass prohibited sensitive key '${key}' to GA4 event params.`);
    }
    sanitized[key] = value;
  }
  return sanitized;
}

/**
 * Validates whether a client_id conforms to the Google-recommended Web Measurement Protocol format:
 * two positive numbers separated by a period.
 */
export function isValidWebClientId(clientId: string): boolean {
  if (!clientId || typeof clientId !== 'string') return false;
  return /^\d+\.\d+$/.test(clientId.trim());
}

/**
 * Generates a deterministic Web Measurement Protocol client_id from an actor ID and initial epoch.
 */
export function generateWebClientId(actorId: string, initialEpochSeconds = 1730000000): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < actorId.length; i++) {
    hash ^= actorId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const uint32 = hash >>> 0;
  return `${uint32}.${initialEpochSeconds}`;
}
