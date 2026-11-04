import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enrichProductCatalog,
  interpretShoppingQuery,
  getCircuitBreakerState,
  generateDeterministicCatalogFallback,
  generateDeterministicShoppingFallback,
} from '@/lib/commercemind-client';
import { calculateListingQuality } from '@/lib/commercemind-quality';
import {
  validateAndCompileFilterAST,
  ASTSecurityViolationError,
} from '@/lib/commercemind-ast';

describe('Phase 1 Hardened Verification Gate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Gate 1: Deterministic Quality Scoring Matrix
  // ---------------------------------------------------------------------------
  describe('Gate 1: Deterministic Quality Scoring', () => {
    it('calculates expected score breakdown and grade transparently', () => {
      const quality = calculateListingQuality({
        title: 'Executive Brown Leather Handbag',
        category: 'Bags & Accessories',
        description: 'Spacious brown leather handbag designed for professional office versatility with interior compartments and durable lining.',
        attributes: {
          color: { value: 'Brown', provenance: 'explicitly_supplied', normalization_state: 'exact' },
          size: { value: 'Large', provenance: 'explicitly_supplied', normalization_state: 'exact' },
          material: { value: 'Genuine Leather', provenance: 'explicitly_supplied', normalization_state: 'exact' },
        },
        tags: ['handbag', 'leather', 'office', 'executive'],
      });

      expect(quality.score).toBeGreaterThanOrEqual(85);
      expect(quality.grade).toBe('A');
      expect(quality.breakdown.title_clarity).toBe(25);
      expect(quality.breakdown.attribute_completeness).toBe(45);
    });

    it('penalizes unresolved ambiguities correctly', () => {
      const withAmbiguity = calculateListingQuality({
        title: 'Cotton T-Shirt L/XL',
        category: 'Fashion',
        description: 'Casual shirt.',
        attributes: {
          size: { value: ['L', 'XL'], provenance: 'explicitly_supplied', normalization_state: 'unresolved' },
        },
        ambiguities: [{ field: 'size', raw_token: 'L/XL', possible_values: ['L', 'XL'], action_taken: 'retained_all' }],
      });

      expect(withAmbiguity.breakdown.attribute_completeness).toBeLessThan(40);
    });
  });

  // ---------------------------------------------------------------------------
  // Gate 2: AST Security & Injection Protection
  // ---------------------------------------------------------------------------
  describe('Gate 2: AST Compiler Security Validation', () => {
    it('accepts valid allowlisted fields and operators', () => {
      const validClauses = [
        { field: 'category', operator: 'eq', value: 'Footwear' },
        { field: 'price', operator: 'lte', value: 5000 },
        { field: 'attributes.material', operator: 'nin', value: ['Suede'] },
      ];

      const compiled = validateAndCompileFilterAST(validClauses);
      expect(compiled.length).toBe(3);
      expect(compiled[0].field).toBe('category');
    });

    it('rejects disallowed SQL/NoSQL injection fields', () => {
      const maliciousClauses = [
        { field: 'users.password_hash; DROP TABLE products; --', operator: 'eq', value: '1' },
      ];

      expect(() => validateAndCompileFilterAST(maliciousClauses)).toThrow(ASTSecurityViolationError);
    });

    it('rejects invalid or dangerous operators', () => {
      const badOpClauses = [
        { field: 'price', operator: '$where', value: 'this.price > 0' },
      ];

      expect(() => validateAndCompileFilterAST(badOpClauses)).toThrow(ASTSecurityViolationError);
    });
  });

  // ---------------------------------------------------------------------------
  // Gate 3: Provider Resilience, Timeouts & Circuit Breaker
  // ---------------------------------------------------------------------------
  describe('Gate 3: Circuit Breaker & Fallback Degradation', () => {
    it('falls back gracefully to deterministic extraction on network timeout', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError: The operation was aborted')), 10);
        });
      });

      const result = await enrichProductCatalog({
        vendorText: 'Black leather office shoes size 42',
        category: 'Footwear',
      });

      expect(result.status).toBe('low_confidence');
      expect(result.attributes.color.value).toBe('Black');
      expect(result.attributes.color.provenance).toBe('inferred');
      expect(result.listing_quality.score).toBeGreaterThan(0);
    });

    it('trips circuit breaker after consecutive failures and serves immediate fallbacks', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      // Trip the breaker with 3 consecutive failures
      await enrichProductCatalog({ vendorText: 'fail 1' });
      await enrichProductCatalog({ vendorText: 'fail 2' });
      await enrichProductCatalog({ vendorText: 'fail 3' });

      expect(getCircuitBreakerState()).toBe('OPEN');

      // The 4th call should immediately return fallback without attempting fetch
      const start = Date.now();
      const fallback = await interpretShoppingQuery({ query: 'Black shoes under 3000' });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Immediate synchronous return
      expect(fallback.status).toBe('low_confidence');
      expect(fallback.budget_constraint.max_limit?.amount).toBe(3000);
    });
  });
});
