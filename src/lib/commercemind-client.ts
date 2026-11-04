import {
  CommerceMindCatalogEnrichment,
  CommerceMindShoppingInterpretation,
} from '@/lib/types';

const COMMERCEMIND_API_URL = process.env.COMMERCEMIND_INFERENCE_URL || 'http://localhost:8001';

export interface EnrichProductRequest {
  vendorText: string;
  category?: string;
}

export interface InterpretShoppingRequest {
  query: string;
  sessionId?: string;
}

/**
 * Calls CommerceMind Engine 1 to extract structured catalog attributes,
 * normalize values with 3-state confidence, flag unverified claims, and compute a quality score.
 */
export async function enrichProductCatalog(
  payload: EnrichProductRequest
): Promise<CommerceMindCatalogEnrichment> {
  const res = await fetch(`${COMMERCEMIND_API_URL}/v1/catalog/enrich`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: payload.vendorText,
      category_hint: payload.category,
    }),
  });

  if (!res.ok) {
    throw new Error(`CommerceMind Engine 1 error: ${res.status} ${await res.text()}`);
  }

  const data: CommerceMindCatalogEnrichment = await res.json();
  return data;
}

/**
 * Calls CommerceMind Engine 2 to parse a customer natural language/multilingual query
 * into an allowlisted Filter AST, budget constraints, and semantic search tokens.
 */
export async function interpretShoppingQuery(
  payload: InterpretShoppingRequest
): Promise<CommerceMindShoppingInterpretation> {
  const res = await fetch(`${COMMERCEMIND_API_URL}/v1/shopping/interpret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: payload.query,
      session_id: payload.sessionId,
    }),
  });

  if (!res.ok) {
    throw new Error(`CommerceMind Engine 2 error: ${res.status} ${await res.text()}`);
  }

  const data: CommerceMindShoppingInterpretation = await res.json();
  return data;
}
