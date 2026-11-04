import type { ConsentSnapshot } from '@/lib/analytics-types';

export interface AIConciergeQueryParams {
  sessionId: string;
  detectedLanguage: 'en' | 'sw' | 'sheng' | 'mixed';
  intent: string;
  category?: string | null;
  hasBudgetConstraint: boolean;
  budgetAmount?: number | null;
}

export interface AIRecommendationImpressionParams {
  sessionId: string;
  productIds: string[];
  resultCount: number;
  isFallback: boolean;
}

export interface AIRecommendationClickParams {
  sessionId: string;
  productId: string;
  position: number;
}

export interface AIAssistedCartParams {
  sessionId: string;
  productId: string;
  productName: string;
  price: number;
  currency: string;
}

export interface CatalogGapInsight {
  gapId: string;
  category?: string | null;
  budgetLimit?: number | null;
  currency: string;
  semanticTokens: string[];
  timestamp: string;
}

export interface DispatchedAnalyticsEvent {
  eventId: string;
  name: string;
  params: Record<string, unknown>;
  timestamp: string;
}

// In-memory deduplication cache
const dispatchedEventIds = new Set<string>();
const catalogGapRegistry: CatalogGapInsight[] = [];

/**
 * Computes deterministic event fingerprint for deduplication
 */
function computeEventFingerprint(eventName: string, params: Record<string, unknown>): string {
  const serialized = JSON.stringify(params, Object.keys(params).sort());
  return `${eventName}:${serialized}`;
}

/**
 * Dispatches event safely if analytics consent is granted
 */
function safeDispatch(
  name: string,
  params: Record<string, unknown>,
  consent?: ConsentSnapshot
): boolean {
  // Respect analytics consent: suppress when denied
  if (consent && consent.analyticsStorage !== 'granted') {
    return false;
  }

  const fingerprint = computeEventFingerprint(name, params);
  if (dispatchedEventIds.has(fingerprint)) {
    return false; // Deduplication: prevent double-firing
  }
  dispatchedEventIds.add(fingerprint);

  // If in browser context with gtag defined, push event
  if (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag === 'function'
  ) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', name, params);
  }

  return true;
}

/**
 * Funnel Step 1: Track AI Concierge Query
 * Never transmits raw user prompt PII; only structured intent metadata.
 */
export function trackAIConciergeQuery(
  params: AIConciergeQueryParams,
  consent?: ConsentSnapshot
): boolean {
  return safeDispatch(
    'ai_concierge_query',
    {
      session_id: params.sessionId,
      query_language: params.detectedLanguage,
      intent: params.intent,
      category: params.category || 'all',
      has_budget_filter: params.hasBudgetConstraint ? 1 : 0,
      budget_amount: params.budgetAmount || 0,
    },
    consent
  );
}

/**
 * Funnel Step 2: Track AI Recommendation Impression
 */
export function trackAIRecommendationImpression(
  params: AIRecommendationImpressionParams,
  consent?: ConsentSnapshot
): boolean {
  return safeDispatch(
    'ai_recommendation_impression',
    {
      session_id: params.sessionId,
      product_ids: params.productIds.slice(0, 10).join(','),
      result_count: params.resultCount,
      is_fallback: params.isFallback ? 1 : 0,
    },
    consent
  );
}

/**
 * Funnel Step 3: Track AI Recommendation Click
 */
export function trackAIRecommendationClick(
  params: AIRecommendationClickParams,
  consent?: ConsentSnapshot
): boolean {
  return safeDispatch(
    'ai_recommendation_click',
    {
      session_id: params.sessionId,
      item_id: params.productId,
      position: params.position,
    },
    consent
  );
}

/**
 * Funnel Step 4: Track AI-Assisted Add to Cart
 */
export function trackAIAssistedAddToCart(
  params: AIAssistedCartParams,
  consent?: ConsentSnapshot
): boolean {
  return safeDispatch(
    'add_to_cart',
    {
      is_ai_assisted: 1,
      ai_session_id: params.sessionId,
      currency: params.currency,
      value: params.price,
      items: [
        {
          item_id: params.productId,
          item_name: params.productName,
          price: params.price,
          quantity: 1,
        },
      ],
    },
    consent
  );
}

/**
 * Funnel Step 5: Attribute Purchase to AI Assistance
 * Injects AI attribution parameters without mutating GA4 purchase schema or breaking outbox.
 */
export function attributePurchaseToAI(
  basePurchaseParams: Record<string, unknown>,
  aiSessionId?: string | null
): Record<string, unknown> {
  if (!aiSessionId) {
    return {
      ...basePurchaseParams,
      is_ai_assisted: 0,
    };
  }

  return {
    ...basePurchaseParams,
    is_ai_assisted: 1,
    ai_session_id: aiSessionId,
  };
}

/**
 * Catalog Gap Insight Collector: Records unfulfilled search demands
 */
export function recordCatalogGapInsight(
  category: string | null | undefined,
  semanticTokens: string[],
  budgetLimit?: number | null,
  currency: 'KES' | 'USD' = 'KES'
): CatalogGapInsight {
  const insight: CatalogGapInsight = {
    gapId: `gap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    category: category || 'Unspecified',
    budgetLimit: budgetLimit || null,
    currency,
    semanticTokens: semanticTokens.filter((t) => t.length > 2),
    timestamp: new Date().toISOString(),
  };

  catalogGapRegistry.push(insight);
  return insight;
}

/**
 * Summarizes catalog gaps for vendor merchandising intelligence
 */
export function getCatalogGapSummary(): {
  totalGapsRecorded: number;
  topRequestedCategories: Record<string, number>;
  topUnmetSearchTokens: Array<{ token: string; count: number }>;
} {
  const categoryCounts: Record<string, number> = {};
  const tokenCounts: Record<string, number> = {};

  for (const gap of catalogGapRegistry) {
    const cat = gap.category || 'Unspecified';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    for (const token of gap.semanticTokens) {
      const lower = token.toLowerCase();
      tokenCounts[lower] = (tokenCounts[lower] || 0) + 1;
    }
  }

  const sortedTokens = Object.entries(tokenCounts)
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalGapsRecorded: catalogGapRegistry.length,
    topRequestedCategories: categoryCounts,
    topUnmetSearchTokens: sortedTokens,
  };
}
