import {
  CommerceMindCatalogEnrichment,
  CommerceMindShoppingInterpretation,
} from '@/lib/types';
import { calculateListingQuality } from '@/lib/commercemind-quality';
import { validateAndCompileFilterAST } from '@/lib/commercemind-ast';

const COMMERCEMIND_API_URL = process.env.COMMERCEMIND_INFERENCE_URL || 'http://localhost:8001';
const INFERENCE_TIMEOUT_MS = 3500; // Hard 3.5s timeout requirement

// Circuit Breaker State
let failureCount = 0;
let lastFailureTimestamp = 0;
const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT_MS = 30000; // 30s open window

export function getCircuitBreakerState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
  const now = Date.now();
  if (failureCount >= FAILURE_THRESHOLD) {
    if (now - lastFailureTimestamp > RESET_TIMEOUT_MS) {
      return 'HALF_OPEN';
    }
    return 'OPEN';
  }
  return 'CLOSED';
}

export function recordSuccess() {
  failureCount = 0;
}

export function recordFailure() {
  failureCount++;
  lastFailureTimestamp = Date.now();
}

/**
 * Fetch with strict abort timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = INFERENCE_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Deterministic Heuristic Fallback for Catalog Enrichment
 */
export function generateDeterministicCatalogFallback(text: string, categoryHint?: string): CommerceMindCatalogEnrichment {
  const clean = text.toLowerCase();
  
  // Heuristic color extraction
  let detectedColor = 'Multi-color';
  for (const c of ['black', 'blue', 'brown', 'yellow', 'white', 'green', 'red']) {
    if (clean.includes(c)) {
      detectedColor = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  // Heuristic size extraction
  let detectedSize: string | string[] = 'Standard';
  let sizeState: 'exact' | 'unresolved' = 'exact';
  if (clean.includes('m/l') || clean.includes('l/xl')) {
    detectedSize = clean.includes('m/l') ? ['M', 'L'] : ['L', 'XL'];
    sizeState = 'unresolved';
  }

  const category = categoryHint || 'Fashion';
  const subcategory = 'General';
  const productType = 'Product';

  const attributes: CommerceMindCatalogEnrichment['attributes'] = {
    color: {
      value: detectedColor,
      provenance: 'inferred',
      normalization_state: 'approximate',
      raw_source: null,
    },
    size: {
      value: detectedSize,
      provenance: 'inferred',
      normalization_state: sizeState,
      raw_source: null,
    },
  };

  const quality = calculateListingQuality({
    title: text.slice(0, 40),
    category,
    description: text,
    attributes,
    tags: [category.toLowerCase(), detectedColor.toLowerCase()],
  });

  return {
    task: 'catalog_enrichment',
    status: 'low_confidence',
    category,
    subcategory,
    product_type: productType,
    attributes,
    ambiguities_detected: sizeState === 'unresolved' ? [{
      field: 'size',
      raw_token: 'compound',
      possible_values: detectedSize,
      action_taken: 'retained_all',
    }] : [],
    missing_specifications: ['material', 'care_instructions'],
    normalized_tags: [category.toLowerCase(), detectedColor.toLowerCase()],
    suggested_description: {
      text,
      style: 'casual',
      grounded_on_facts_only: true,
    },
    listing_quality: quality,
  };
}

/**
 * Deterministic Heuristic Fallback for Shopping Intent
 */
export function generateDeterministicShoppingFallback(query: string): CommerceMindShoppingInterpretation {
  const clean = query.toLowerCase();

  // Extract simple budget
  let maxAmount: number | null = null;
  const numMatch = clean.match(/\b(\d{3,6})\b/);
  if (numMatch) {
    maxAmount = parseFloat(numMatch[1]);
  }

  return {
    task: 'shopping_intent',
    status: 'low_confidence',
    intent: 'product_search',
    detected_language: 'en',
    budget_constraint: {
      currency: 'KES',
      min_limit: null,
      max_limit: maxAmount ? { amount: maxAmount, boundary: 'inclusive' } : null,
    },
    filter_ast: {
      category: null,
      subcategory: null,
      clauses: [],
    },
    semantic_search_tokens: clean.split(/\s+/).filter((w) => w.length > 2),
    clarification_prompt: null,
  };
}

/**
 * Resilient Engine 1 Client
 */
export async function enrichProductCatalog(payload: {
  vendorText: string;
  category?: string;
}): Promise<CommerceMindCatalogEnrichment> {
  const state = getCircuitBreakerState();
  if (state === 'OPEN') {
    console.warn('[CommerceMind Circuit OPEN] Degrading to deterministic heuristic extraction');
    return generateDeterministicCatalogFallback(payload.vendorText, payload.category);
  }

  try {
    const res = await fetchWithTimeout(`${COMMERCEMIND_API_URL}/v1/catalog/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: payload.vendorText,
        category_hint: payload.category,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data: CommerceMindCatalogEnrichment = await res.json();
    recordSuccess();

    // Recalculate listing quality with authoritative deterministic algorithm
    data.listing_quality = calculateListingQuality({
      title: payload.vendorText.slice(0, 50),
      category: data.category,
      description: data.suggested_description?.text,
      attributes: data.attributes,
      tags: data.normalized_tags,
      ambiguities: data.ambiguities_detected,
    });

    return data;
  } catch (err: unknown) {
    recordFailure();
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[CommerceMind Provider Call Failed: ${errMsg}] Using deterministic fallback`);
    return generateDeterministicCatalogFallback(payload.vendorText, payload.category);
  }
}

/**
 * Resilient Engine 2 Client
 */
export async function interpretShoppingQuery(payload: {
  query: string;
  sessionId?: string;
}): Promise<CommerceMindShoppingInterpretation> {
  const state = getCircuitBreakerState();
  if (state === 'OPEN') {
    return generateDeterministicShoppingFallback(payload.query);
  }

  try {
    const res = await fetchWithTimeout(`${COMMERCEMIND_API_URL}/v1/shopping/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: payload.query,
        session_id: payload.sessionId,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data: CommerceMindShoppingInterpretation = await res.json();
    recordSuccess();

    // Enforce server-side AST security validation
    if (data.filter_ast?.clauses) {
      data.filter_ast.clauses = validateAndCompileFilterAST(data.filter_ast.clauses);
    }

    return data;
  } catch (err: unknown) {
    recordFailure();
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[CommerceMind Shopping Call Failed: ${errMsg}] Using fallback AST`);
    return generateDeterministicShoppingFallback(payload.query);
  }
}
