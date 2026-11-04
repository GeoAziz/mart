import { NextRequest, NextResponse } from 'next/server';
import { interpretShoppingQuery } from '@/lib/commercemind-client';
import { firestoreAdmin as db } from '@/lib/firebase-admin';
import type { Product } from '@/lib/types';
import {
  getSessionConstraints,
  saveSessionConstraints,
  mergeSessionConstraints,
  compileSessionToAST,
} from '@/lib/commercemind-session';

/**
 * POST /api/concierge/chat
 * Customer-facing Conversational Shopping Concierge endpoint.
 *
 * Requirements:
 * 1. Conversational constraint persistence across multi-turn queries.
 * 2. Ambiguity detection and interactive clarification suggestions.
 * 3. Server-side AST allowlisting and injection protection.
 * 4. 100% live inventory grounding (stock > 0 and status == 'active').
 * 5. Traditional search fallback when AI matching produces 0 results.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, sessionId } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty search "query"' },
        { status: 400 }
      );
    }

    const activeSessionId =
      sessionId || `cm_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Step 1: Interpret via CommerceMind Model Engine
    let interpretation;
    try {
      interpretation = await interpretShoppingQuery({
        query,
        sessionId: activeSessionId,
      });
    } catch (modelErr: unknown) {
      const errMsg = modelErr instanceof Error ? modelErr.message : String(modelErr);
      console.warn('[CommerceMind Model Fallback]:', errMsg);
      // Fallback: rule-based intent parsing
      interpretation = {
        task: 'shopping_intent' as const,
        status: 'success' as const,
        intent: 'product_search' as const,
        detected_language: 'en' as const,
        budget_constraint: {
          currency: 'KES' as const,
          min_limit: null,
          max_limit: null,
        },
        filter_ast: {
          category: null,
          subcategory: null,
          clauses: [],
        },
        semantic_search_tokens: query.toLowerCase().split(/\s+/).filter(Boolean),
        clarification_prompt: null,
      };
    }

    // Step 2: Merge multi-turn session constraints
    const previousConstraints = getSessionConstraints(activeSessionId);
    const accumulated = mergeSessionConstraints(previousConstraints, interpretation, query);
    saveSessionConstraints(activeSessionId, accumulated);

    // Step 3: Compile safe parameterized AST
    const compiledClauses = compileSessionToAST(accumulated);

    // Step 4: Query Firestore with strict inventory grounding (status == 'active' & stock > 0)
    let productRef: FirebaseFirestore.Query = db
      .collection('products')
      .where('status', '==', 'active')
      .where('stock', '>', 0);

    if (accumulated.category) {
      productRef = productRef.where('category', '==', accumulated.category);
    }

    if (accumulated.max_price !== null) {
      productRef = productRef.where('price', '<=', accumulated.max_price);
    }

    if (accumulated.min_price !== null) {
      productRef = productRef.where('price', '>=', accumulated.min_price);
    }

    let snapshot = await productRef.limit(20).get();

    // If exact category match returned 0, try broader search (e.g. Footwear items in Fashion)
    if (snapshot.empty && accumulated.category === 'Footwear') {
      let altRef: FirebaseFirestore.Query = db
        .collection('products')
        .where('status', '==', 'active')
        .where('stock', '>', 0)
        .where('category', '==', 'Fashion');

      if (accumulated.max_price !== null) altRef = altRef.where('price', '<=', accumulated.max_price);
      if (accumulated.min_price !== null) altRef = altRef.where('price', '>=', accumulated.min_price);
      snapshot = await altRef.limit(20).get();
    }

    let candidateProducts: Product[] = [];
    snapshot.forEach((doc) => {
      candidateProducts.push({ id: doc.id, ...doc.data() } as Product);
    });

    // Determine query tokens for semantic relevance filtering
    const tokens = accumulated.semantic_tokens.length > 0
      ? accumulated.semantic_tokens
      : query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

    // Filter candidate products to guarantee semantic relevance (never return groceries for shoes)
    let matchingProducts = candidateProducts.filter((p) => {
      const pText = `${p.name || ''} ${p.description || ''} ${p.category || ''} ${p.brand || ''}`.toLowerCase();

      // Brand filter: if brand is requested, product must match brand
      if (accumulated.brand) {
        const b = accumulated.brand.toLowerCase();
        const pBrand = (p.brand || '').toLowerCase();
        const pName = (p.name || '').toLowerCase();
        if (!pBrand.includes(b) && !pName.includes(b)) {
          return false;
        }
      }

      // Keyword / token filter: product must match at least one relevant search token
      if (tokens.length > 0) {
        const hasTokenMatch = tokens.some((t) => pText.includes(t.toLowerCase()));
        if (!hasTokenMatch && !accumulated.category) {
          return false;
        }
      }

      return true;
    });

    // In-memory AST negative filtering (e.g. materials or attributes rejected by user)
    if (accumulated.negative_materials.length > 0) {
      matchingProducts = matchingProducts.filter((p) => {
        const desc = (p.description || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return !accumulated.negative_materials.some(
          (m) => desc.includes(m) || name.includes(m)
        );
      });
    }

    // Step 5: Traditional Search Fallback if 0 matches found via AST
    let isFallback = false;
    if (matchingProducts.length === 0) {
      isFallback = true;
      const fallbackSnap = await db
        .collection('products')
        .where('status', '==', 'active')
        .where('stock', '>', 0)
        .limit(50)
        .get();

      const fallbackList: Product[] = [];
      fallbackSnap.forEach((doc) => {
        fallbackList.push({ id: doc.id, ...doc.data() } as Product);
      });

      // Filter and rank strictly by token overlaps (only items mentioning query keywords)
      matchingProducts = fallbackList
        .filter((p) => {
          const text = `${p.name || ''} ${p.description || ''} ${p.category || ''} ${p.brand || ''}`.toLowerCase();
          return tokens.some((t) => text.includes(t.toLowerCase()));
        })
        .slice(0, 6);
    }

    matchingProducts = matchingProducts.slice(0, 12);

    // Step 6: Clarification generation for ambiguous queries
    const clarificationOptions: string[] = [];
    if (interpretation.clarification_prompt) {
      // Suggest concrete clarification chips based on category or query
      if (!accumulated.category) {
        clarificationOptions.push('Fashion', 'Electronics', 'Footwear', 'Home Goods');
      }
      if (!accumulated.max_price) {
        clarificationOptions.push('Under KES 2,500', 'Under KES 5,000', 'Under KES 10,000');
      }
    }

    // Step 7: Grounded explanation
    let explanation = '';
    if (matchingProducts.length > 0) {
      explanation = `Found ${matchingProducts.length} verified item(s) in stock.`;
      if (accumulated.min_price !== null && accumulated.max_price !== null) {
        explanation += ` All within your budget between KES ${accumulated.min_price.toLocaleString()} and KES ${accumulated.max_price.toLocaleString()}.`;
      } else if (accumulated.max_price !== null) {
        explanation += ` All within your budget of KES ${accumulated.max_price.toLocaleString()}.`;
      } else if (accumulated.min_price !== null) {
        explanation += ` Starting from KES ${accumulated.min_price.toLocaleString()}.`;
      }
      if (accumulated.negative_materials.length > 0) {
        explanation += ` Filtered out items made of ${accumulated.negative_materials.join(', ')}.`;
      }
    } else {
      explanation =
        `We couldn't find in-stock items matching "${query}". Would you like to expand your search budget or try a different category?`;
    }

    return NextResponse.json({
      success: true,
      sessionId: activeSessionId,
      turn: accumulated.turn_count,
      interpretation,
      accumulatedConstraints: accumulated,
      compiledAST: compiledClauses,
      explanation,
      clarificationPrompt: interpretation.clarification_prompt,
      clarificationOptions,
      products: matchingProducts,
      isFallback,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Internal error processing shopping request';
    console.error('[Concierge Chat Error]:', errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
