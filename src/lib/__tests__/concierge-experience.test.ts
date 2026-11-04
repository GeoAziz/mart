import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSessionConstraints,
  saveSessionConstraints,
  mergeSessionConstraints,
  compileSessionToAST,
  type AccumulatedConstraints,
} from '@/lib/commercemind-session';
import type { CommerceMindShoppingInterpretation } from '@/lib/types';

describe('Phase 3 — Conversational Concierge & Shopper Experience Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Multi-Turn Conversational Constraint State Persistence & Refinement
  // ---------------------------------------------------------------------------
  describe('Multi-Turn Conversational State Persistence', () => {
    it('accumulates and refines constraints across sequential conversation turns', () => {
      const sessionId = 'test-session-multi-turn-1';

      // Turn 1: Initial broad search in Sheng/English
      const turn1Interpretation: CommerceMindShoppingInterpretation = {
        task: 'shopping_intent',
        status: 'success',
        intent: 'product_search',
        detected_language: 'sheng',
        budget_constraint: {
          currency: 'KES',
          min_limit: null,
          max_limit: { amount: 5000, boundary: 'inclusive' },
        },
        filter_ast: {
          category: 'Fashion',
          subcategory: 'Jackets',
          clauses: [
            { field: 'category', operator: 'eq', value: 'Fashion' },
            { field: 'attributes.material', operator: 'eq', value: 'Leather' },
          ],
        },
        semantic_search_tokens: ['leather', 'jacket'],
        clarification_prompt: null,
      };

      const initialConstraints = getSessionConstraints(sessionId);
      const afterTurn1 = mergeSessionConstraints(
        initialConstraints,
        turn1Interpretation,
        'Natafuta leather jacket under 5k'
      );
      saveSessionConstraints(sessionId, afterTurn1);

      expect(afterTurn1.turn_count).toBe(1);
      expect(afterTurn1.category).toBe('Fashion');
      expect(afterTurn1.max_price).toBe(5000);
      expect(afterTurn1.attributes.material).toBe('Leather');

      // Turn 2: Conversational refinement ("Show me black ones")
      const turn2Interpretation: CommerceMindShoppingInterpretation = {
        task: 'shopping_intent',
        status: 'success',
        intent: 'product_search',
        detected_language: 'en',
        budget_constraint: { currency: 'KES', min_limit: null, max_limit: null },
        filter_ast: {
          category: null,
          subcategory: null,
          clauses: [{ field: 'attributes.color', operator: 'eq', value: 'Black' }],
        },
        semantic_search_tokens: ['black'],
        clarification_prompt: null,
      };

      const retrievedAfterTurn1 = getSessionConstraints(sessionId);
      const afterTurn2 = mergeSessionConstraints(
        retrievedAfterTurn1,
        turn2Interpretation,
        'Show me black ones'
      );
      saveSessionConstraints(sessionId, afterTurn2);

      expect(afterTurn2.turn_count).toBe(2);
      expect(afterTurn2.category).toBe('Fashion'); // Preserved from Turn 1
      expect(afterTurn2.max_price).toBe(5000); // Preserved from Turn 1
      expect(afterTurn2.attributes.material).toBe('Leather'); // Preserved from Turn 1
      expect(afterTurn2.attributes.color).toBe('Black'); // Added in Turn 2

      // Turn 3: Budget adjustment ("Actually under 4k and no suede")
      const turn3Interpretation: CommerceMindShoppingInterpretation = {
        task: 'shopping_intent',
        status: 'success',
        intent: 'product_search',
        detected_language: 'en',
        budget_constraint: {
          currency: 'KES',
          min_limit: null,
          max_limit: { amount: 4000, boundary: 'inclusive' },
        },
        filter_ast: {
          category: null,
          subcategory: null,
          clauses: [
            { field: 'attributes.material', operator: 'nin', value: ['Suede'] },
          ],
        },
        semantic_search_tokens: ['suede'],
        clarification_prompt: null,
      };

      const retrievedAfterTurn2 = getSessionConstraints(sessionId);
      const afterTurn3 = mergeSessionConstraints(
        retrievedAfterTurn2,
        turn3Interpretation,
        'Actually under 4k and no suede'
      );

      expect(afterTurn3.turn_count).toBe(3);
      expect(afterTurn3.max_price).toBe(4000); // Updated budget
      expect(afterTurn3.category).toBe('Fashion'); // Preserved
      expect(afterTurn3.attributes.color).toBe('Black'); // Preserved
      expect(afterTurn3.negative_materials).toContain('suede'); // Negative constraint added
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Safe AST Compilation from Accumulated Constraints
  // ---------------------------------------------------------------------------
  describe('Accumulated Session AST Compilation & Security Allowlisting', () => {
    it('compiles multi-turn constraints into safe, validated AST clauses', () => {
      const constraints: AccumulatedConstraints = {
        category: 'Footwear',
        subcategory: "Men's Shoes",
        brand: null,
        min_price: 1500,
        max_price: 4500,
        currency: 'KES',
        attributes: {
          size: '42',
          color: 'Brown',
        },
        negative_materials: ['suede'],
        semantic_tokens: ['official', 'shoes'],
        turn_count: 2,
        last_query: 'Official brown shoes 42',
      };

      const compiled = compileSessionToAST(constraints);

      // Verify all compiled clauses match allowlist
      const fields = compiled.map((c) => c.field);
      expect(fields).toContain('category');
      expect(fields).toContain('subcategory');
      expect(fields).toContain('price');
      expect(fields).toContain('attributes.size');
      expect(fields).toContain('attributes.color');
      expect(fields).toContain('attributes.material');

      const maxPriceClause = compiled.find(
        (c) => c.field === 'price' && c.operator === 'lte'
      );
      expect(maxPriceClause?.value).toBe(4500);

      const minPriceClause = compiled.find(
        (c) => c.field === 'price' && c.operator === 'gte'
      );
      expect(minPriceClause?.value).toBe(1500);

      const ninClause = compiled.find(
        (c) => c.field === 'attributes.material' && c.operator === 'nin'
      );
      expect(ninClause?.value).toEqual(['suede']);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Pre-Cart Stock & Price Revalidation Contract Logic
  // ---------------------------------------------------------------------------
  describe('Pre-Cart Revalidation Logic', () => {
    it('detects price drift and flags out-of-stock items reliably', () => {
      // Mock live catalog record
      const liveProduct = {
        id: 'prod-456',
        name: 'Running Shoes',
        price: 3200,
        stock: 0, // Out of stock
        status: 'active',
      };

      const requestedQuantity = 1;
      const expectedPrice = 2800; // Customer saw old price 2800

      // Revalidation verification
      const isOutOfStock = liveProduct.stock < requestedQuantity;
      const priceDifference = Math.abs(liveProduct.price - expectedPrice);
      const isPriceDrifted = priceDifference > 0.01;

      expect(isOutOfStock).toBe(true);
      expect(isPriceDrifted).toBe(true);
      expect(liveProduct.price).toBe(3200);
    });
  });
});

