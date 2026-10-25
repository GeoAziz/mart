/**
 * Client-side Analytics and Attribution Utilities for ZilaCart / TechStore.
 * Provides consent management, GA4 identity retrieval, and event tracking
 * with in-memory deduplication and privacy safeguards.
 */

import { analytics } from '@/lib/firebase-client';
import { logEvent as firebaseLogEvent } from 'firebase/analytics';
import type { AttributionContext, ConsentSnapshot, GA4Item } from '@/lib/analytics-types';

declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

// ────────────────────────────────────────────────────────────
// Consent Management
// ────────────────────────────────────────────────────────────

const CONSENT_STORAGE_KEY = 'zilacart_analytics_consent';

export function getClientConsent(): ConsentSnapshot {
  if (typeof window === 'undefined') {
    return {
      analyticsStorage: 'denied',
      consentTimestamp: new Date().toISOString(),
      policyVersion: '2026.1',
      source: 'default_denied',
    };
  }

  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.analyticsStorage === 'granted' || parsed.analyticsStorage === 'denied') {
        return parsed;
      }
    }
  } catch (err) {
    // LocalStorage inaccessible
  }

  return {
    analyticsStorage: 'granted', // Default consent unless denied
    consentTimestamp: new Date().toISOString(),
    policyVersion: '2026.1',
    source: 'cookie_banner',
  };
}

export function setClientConsent(status: 'granted' | 'denied', source: 'cookie_banner' | 'user_account_settings' = 'cookie_banner'): ConsentSnapshot {
  const snapshot: ConsentSnapshot = {
    analyticsStorage: status,
    consentTimestamp: new Date().toISOString(),
    policyVersion: '2026.1',
    source,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (err) {}

    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: status,
      });
    }
  }

  return snapshot;
}

// ────────────────────────────────────────────────────────────
// Attribution Context Extraction
// ────────────────────────────────────────────────────────────

export function getAttributionContext(): AttributionContext {
  const consent = getClientConsent();
  if (typeof window === 'undefined' || consent.analyticsStorage !== 'granted') {
    return {
      clientId: null,
      sessionId: null,
      capturedAt: new Date().toISOString(),
      consentSnapshot: consent,
    };
  }

  // 1. Extract client_id from _ga cookie (format: GA1.1.123456789.1700000000)
  let clientId: string | null = null;
  const match = document.cookie.match(/(?:^|; )_ga=([^;]*)/);
  if (match && match[1]) {
    const parts = match[1].split('.');
    if (parts.length >= 4) {
      clientId = `${parts[2]}.${parts[3]}`;
    } else {
      clientId = match[1];
    }
  }

  // 2. Extract numeric session_id from _ga_<CONTAINER_ID> (format: GS1.1.1710000000.1.1...)
  let sessionId: number | null = null;
  const sessionMatch = document.cookie.match(/(?:^|; )_ga_[A-Z0-9]+=([^;]*)/);
  if (sessionMatch && sessionMatch[1]) {
    const parts = sessionMatch[1].split('.');
    if (parts.length >= 3) {
      const rawTimestamp = Number(parts[2]);
      if (!isNaN(rawTimestamp) && rawTimestamp > 0) {
        sessionId = rawTimestamp;
      }
    }
  }

  return {
    clientId,
    sessionId,
    capturedAt: new Date().toISOString(),
    consentSnapshot: consent,
  };
}

// ────────────────────────────────────────────────────────────
// Client Event Dispatch & In-Memory Deduplication
// ────────────────────────────────────────────────────────────

const recentEvents = new Set<string>();

/**
 * Dispatches a client-side event to gtag & Firebase with deduplication.
 */
export function trackClientEvent(
  eventName: string,
  eventParams: Record<string, any> = {},
  dedupKey?: string
) {
  if (typeof window === 'undefined') return;

  const consent = getClientConsent();
  if (consent.analyticsStorage !== 'granted') return;

  // Deduplication check
  if (dedupKey) {
    if (recentEvents.has(dedupKey)) {
      return;
    }
    recentEvents.add(dedupKey);
    // Expire deduplication entry after 3 seconds
    setTimeout(() => recentEvents.delete(dedupKey), 3000);
  }

  // Dispatch to gtag
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }

  // Dispatch to Firebase SDK if initialized
  if (analytics) {
    try {
      firebaseLogEvent(analytics, eventName, eventParams);
    } catch (err) {}
  }
}

// ────────────────────────────────────────────────────────────
// Funnel Event Helpers
// ────────────────────────────────────────────────────────────

export function trackViewItem(item: GA4Item, currency = 'KES') {
  trackClientEvent(
    'view_item',
    {
      currency,
      value: item.price,
      items: [item],
    },
    `view_item_${item.item_id}`
  );
}

export function trackAddToCart(item: GA4Item, currency = 'KES') {
  trackClientEvent('add_to_cart', {
    currency,
    value: item.price * item.quantity,
    items: [item],
  });
}

export function trackRemoveFromCart(item: GA4Item, currency = 'KES') {
  trackClientEvent('remove_from_cart', {
    currency,
    value: item.price * item.quantity,
    items: [item],
  });
}

export function trackBeginCheckout(items: GA4Item[], currency = 'KES') {
  const value = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  trackClientEvent(
    'begin_checkout',
    {
      currency,
      value,
      items,
    },
    `begin_checkout_${items.length}_${value}`
  );
}

export function trackAddShippingInfo(items: GA4Item[], county?: string, currency = 'KES') {
  const value = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  trackClientEvent('add_shipping_info', {
    currency,
    value,
    shipping_county: county,
    items,
  });
}

export function trackAddPaymentInfo(items: GA4Item[], paymentMethod: string, currency = 'KES') {
  const value = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  trackClientEvent('add_payment_info', {
    currency,
    value,
    payment_method: paymentMethod,
    items,
  });
}

/**
 * Merchandising: User views a list of products (category / search list).
 */
export function trackViewItemList(items: GA4Item[], listName = 'General Catalog') {
  trackClientEvent(
    'view_item_list',
    {
      item_list_name: listName,
      items,
    },
    `view_item_list_${listName}_${items.length}`
  );
}

/**
 * Merchandising: User interacts with a promotion banner (Hero carousel, promo card).
 */
export function trackSelectPromotion(promo: { id: string; name: string; creative_name?: string; position?: string }) {
  trackClientEvent('select_promotion', {
    promotion_id: promo.id,
    promotion_name: promo.name,
    creative_name: promo.creative_name,
    creative_slot: promo.position,
  });
}

/**
 * Merchandising: User views a promotion banner.
 */
export function trackViewPromotion(promo: { id: string; name: string; creative_name?: string; position?: string }) {
  trackClientEvent(
    'view_promotion',
    {
      promotion_id: promo.id,
      promotion_name: promo.name,
      creative_name: promo.creative_name,
      creative_slot: promo.position,
    },
    `view_promotion_${promo.id}`
  );
}

/**
 * Privacy-first Search tracking: captures query length and result presence,
 * omitting raw personal or sensitive query text by default.
 */
export function trackSearch(hasResults: boolean, queryLength: number) {
  trackClientEvent('search', {
    has_results: hasResults,
    query_length: queryLength,
  });
}
