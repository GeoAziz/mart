import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  trackAIConciergeQuery,
  trackAIRecommendationImpression,
  trackAIRecommendationClick,
  trackAIAssistedAddToCart,
  attributePurchaseToAI,
  recordCatalogGapInsight,
  getCatalogGapSummary,
} from '@/lib/commercemind-analytics';
import type { ConsentSnapshot } from '@/lib/analytics-types';

describe('Phase 5 — Analytics, Attribution & Catalog Gap Tests', () => {
  const grantedConsent: ConsentSnapshot = {
    analyticsStorage: 'granted',
    consentTimestamp: '2026-11-04T00:00:00.000Z',
    policyVersion: '2026.1',
    source: 'cookie_banner',
  };

  const deniedConsent: ConsentSnapshot = {
    analyticsStorage: 'denied',
    consentTimestamp: '2026-11-04T00:00:00.000Z',
    policyVersion: '2026.1',
    source: 'cookie_banner',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Complete AI Discovery-to-Purchase Funnel & Attribution
  // ---------------------------------------------------------------------------
  describe('AI Discovery-to-Purchase Funnel', () => {
    it('dispatches structured funnel events without exposing raw conversational PII', () => {
      const sessionId = 'cm_funnel_sess_101';

      // Step 1: Concierge Query
      const queryDispatched = trackAIConciergeQuery(
        {
          sessionId,
          detectedLanguage: 'sheng',
          intent: 'product_search',
          category: 'Footwear',
          hasBudgetConstraint: true,
          budgetAmount: 4000,
        },
        grantedConsent
      );
      expect(queryDispatched).toBe(true);

      // Step 2: Recommendations Impression
      const impressionDispatched = trackAIRecommendationImpression(
        {
          sessionId,
          productIds: ['prod_1', 'prod_2', 'prod_3'],
          resultCount: 3,
          isFallback: false,
        },
        grantedConsent
      );
      expect(impressionDispatched).toBe(true);

      // Step 3: Recommendation Click
      const clickDispatched = trackAIRecommendationClick(
        {
          sessionId,
          productId: 'prod_1',
          position: 0,
        },
        grantedConsent
      );
      expect(clickDispatched).toBe(true);

      // Step 4: AI-Assisted Add to Cart
      const cartDispatched = trackAIAssistedAddToCart(
        {
          sessionId,
          productId: 'prod_1',
          productName: 'Official Leather Shoes',
          price: 3800,
          currency: 'KES',
        },
        grantedConsent
      );
      expect(cartDispatched).toBe(true);

      // Step 5: Attribution to Purchase
      const basePurchase = {
        transaction_id: 'ord_999',
        value: 3800,
        currency: 'KES',
        items: [{ item_id: 'prod_1', price: 3800, quantity: 1 }],
      };

      const attributed = attributePurchaseToAI(basePurchase, sessionId);
      expect(attributed.is_ai_assisted).toBe(1);
      expect(attributed.ai_session_id).toBe(sessionId);
      expect(attributed.transaction_id).toBe('ord_999');
    });

    it('attributes unassisted purchases with is_ai_assisted: 0 when no aiSessionId exists', () => {
      const basePurchase = {
        transaction_id: 'ord_1000',
        value: 1200,
        currency: 'KES',
      };

      const attributed = attributePurchaseToAI(basePurchase, null);
      expect(attributed.is_ai_assisted).toBe(0);
      expect(attributed.ai_session_id).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Event Deduplication & Consent-Aware Suppression
  // ---------------------------------------------------------------------------
  describe('Deduplication & Consent Suppression', () => {
    it('suppresses event dispatch when user denies analytics consent', () => {
      const dispatched = trackAIConciergeQuery(
        {
          sessionId: 'cm_denied_sess_202',
          detectedLanguage: 'en',
          intent: 'product_search',
          category: 'Fashion',
          hasBudgetConstraint: false,
        },
        deniedConsent
      );

      expect(dispatched).toBe(false);
    });

    it('deduplicates identical events to avoid double-counting telemetry metrics', () => {
      const params = {
        sessionId: 'cm_dedup_sess_303',
        productId: 'prod_unique_99',
        position: 1,
      };

      const firstCall = trackAIRecommendationClick(params, grantedConsent);
      const secondCall = trackAIRecommendationClick(params, grantedConsent);

      expect(firstCall).toBe(true);
      expect(secondCall).toBe(false); // Suppressed by deduplication filter
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Catalog Gap & Unmet Search Demand Insights
  // ---------------------------------------------------------------------------
  describe('Catalog Gap Reporting', () => {
    it('records and aggregates unmet search queries to identify catalog holes', () => {
      recordCatalogGapInsight('Electronics', ['mechanical', 'keyboard', 'bluetooth'], 6000);
      recordCatalogGapInsight('Electronics', ['mechanical', 'keyboard', 'switches'], 8000);
      recordCatalogGapInsight('Footwear', ['orthopedic', 'sandals'], 3500);

      const summary = getCatalogGapSummary();
      expect(summary.totalGapsRecorded).toBeGreaterThanOrEqual(3);
      expect(summary.topRequestedCategories['Electronics']).toBeGreaterThanOrEqual(2);

      const keyboardToken = summary.topUnmetSearchTokens.find((t) => t.token === 'keyboard');
      expect(keyboardToken).toBeDefined();
      expect(keyboardToken?.count).toBeGreaterThanOrEqual(2);
    });
  });
});

