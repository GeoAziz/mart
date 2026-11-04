import {
  CommerceMindCatalogEnrichment,
  CommerceMindShoppingInterpretation,
} from '@/lib/types';
import { calculateListingQuality } from '@/lib/commercemind-quality';
import { validateAndCompileFilterAST } from '@/lib/commercemind-ast';

const COMMERCEMIND_API_URL = process.env.COMMERCEMIND_INFERENCE_URL || 'http://localhost:8001';
const INFERENCE_TIMEOUT_MS = process.env.COMMERCEMIND_TIMEOUT_MS
  ? parseInt(process.env.COMMERCEMIND_TIMEOUT_MS, 10)
  : 3500; // Configurable timeout ceiling (default 3500ms in unit tests, higher in production)

// Circuit Breaker State
let failureCount = 0;
let lastFailureTimestamp = 0;
let isCanaryProbing = false;
const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT_MS = 30000; // 30s open window

export function resetCircuitBreaker() {
  failureCount = 0;
  lastFailureTimestamp = 0;
  isCanaryProbing = false;
}

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
  isCanaryProbing = false;
}

export function recordFailure() {
  failureCount++;
  lastFailureTimestamp = Date.now();
  isCanaryProbing = false;
}

export function acquireCanaryProbe(): boolean {
  if (getCircuitBreakerState() !== 'HALF_OPEN') return false;
  if (isCanaryProbing) return false;
  isCanaryProbing = true;
  return true;
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
      possible_values: Array.isArray(detectedSize) ? detectedSize : [detectedSize],
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

  // 1. Budget extraction (Range & Single boundary)
  let minAmount: number | null = null;
  let maxAmount: number | null = null;

  const rangeMatch = clean.match(/(?:between|from)?\s*(?:kes|ksh)?\s*([\d,]+)\s*(?:and|to|-)\s*(?:kes|ksh)?\s*([\d,]+)/);
  if (rangeMatch) {
    const v1 = parseFloat(rangeMatch[1].replace(/,/g, ''));
    const v2 = parseFloat(rangeMatch[2].replace(/,/g, ''));
    minAmount = Math.min(v1, v2);
    maxAmount = Math.max(v1, v2);
  } else {
    const underMatch = clean.match(/(?:under|below|chini ya|less than|max|up to|not exceeding)\s*(?:kes|ksh)?\s*([\d,]+)/);
    if (underMatch) {
      maxAmount = parseFloat(underMatch[1].replace(/,/g, ''));
    }
    const aboveMatch = clean.match(/(?:above|over|more than|at least|min|zaidi ya|from)\s*(?:kes|ksh)?\s*([\d,]+)/);
    if (aboveMatch) {
      minAmount = parseFloat(aboveMatch[1].replace(/,/g, ''));
    }
  }

  // 2. Demographic
  let gender: string | null = null;
  if (/\b(women|woman|ladies|female)\b/.test(clean)) gender = 'women';
  else if (/\b(men|man|gentlemen|male)\b/.test(clean)) gender = 'men';
  else if (/\b(kids|children|boys|girls)\b/.test(clean)) gender = 'kids';

  // 3. Category & Subcategory
  let category: string | null = null;
  let subcategory: string | null = null;
  if (/\b(shoe|shoes|sneaker|sneakers|boot|boots|sandals|loafers)\b/.test(clean)) {
    category = 'Footwear';
    if (gender === 'women') subcategory = "Women's Footwear";
    else if (gender === 'men') subcategory = "Men's Footwear";
    else if (gender === 'kids') subcategory = "Kids' Footwear";
    else if (clean.includes('sneaker')) subcategory = 'Sneakers';
    else if (clean.includes('boot')) subcategory = 'Boots';
    else subcategory = 'Shoes';
  } else if (/\b(laptop|laptops|computer|computers|macbook)\b/.test(clean)) {
    category = 'Electronics';
    subcategory = 'Computers & Laptops';
  } else if (/\b(phone|phones|smartphone|smartphones|iphone)\b/.test(clean)) {
    category = 'Electronics';
    subcategory = 'Mobile Phones';
  } else if (/\b(chair|chairs|desk|desks|office)\b/.test(clean)) {
    category = 'Home & Living';
    subcategory = 'Office Furniture';
  } else if (/\b(dress|shirt|jacket|hoodie|jeans|pants|suit)\b/.test(clean)) {
    category = 'Fashion';
    subcategory = gender === 'women' ? "Women's Clothing" : gender === 'men' ? "Men's Clothing" : 'Clothing';
  }

  // 4. Brand
  let brand: string | null = null;
  const knownBrands = ['nike', 'adidas', 'puma', 'samsung', 'apple', 'hp', 'dell', 'lenovo', 'tecno', 'infinix', 'xiaomi', 'oppo', 'sony'];
  for (const b of knownBrands) {
    if (clean.includes(b)) {
      brand = b === 'hp' || b === 'lg' ? b.toUpperCase() : b.charAt(0).toUpperCase() + b.slice(1);
      break;
    }
  }

  // 5. Clauses
  const clauses: Array<{ field: string; operator: 'eq'; value: string | number | boolean }> = [];
  if (category) clauses.push({ field: 'category', operator: 'eq', value: category });
  if (subcategory) clauses.push({ field: 'subcategory', operator: 'eq', value: subcategory });
  if (brand) clauses.push({ field: 'brand', operator: 'eq', value: brand });
  if (gender) clauses.push({ field: 'attributes.gender', operator: 'eq', value: gender });

  // 6. Tokens
  const stopWords = new Set(['under', 'below', 'between', 'and', 'for', 'with', 'in', 'of', 'to', 'at', 'from', 'the', 'a', 'an', 'is', 'kes', 'ksh']);
  const tokens = clean
    .split(/\s+/)
    .map((w) => w.replace(/[^\w]/g, ''))
    .filter((w) => w && !stopWords.has(w) && isNaN(Number(w)) && w.length > 1);

  return {
    task: 'shopping_intent',
    status: 'low_confidence',
    intent: 'product_search',
    detected_language: 'en',
    budget_constraint: {
      currency: 'KES',
      min_limit: minAmount ? { amount: minAmount, boundary: 'inclusive' } : null,
      max_limit: maxAmount ? { amount: maxAmount, boundary: 'inclusive' } : null,
    },
    filter_ast: {
      category,
      subcategory,
      clauses,
    },
    semantic_search_tokens: tokens,
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

  // In HALF_OPEN state, only allow exactly 1 canary probe through; others immediately degrade
  if (state === 'HALF_OPEN' && !acquireCanaryProbe()) {
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
