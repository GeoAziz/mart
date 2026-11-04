import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enrichProductCatalog,
  interpretShoppingQuery,
} from '@/lib/commercemind-client';
import type {
  CommerceMindCatalogEnrichment,
  CommerceMindShoppingInterpretation,
} from '@/lib/types';

describe('Phase 1: CommerceMind Client Foundation Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Engine 1: successfully extracts structured catalog attributes with provenance', async () => {
    const mockEnrichment: CommerceMindCatalogEnrichment = {
      task: 'catalog_enrichment',
      status: 'success',
      category: 'Fashion',
      subcategory: "Women's Clothing",
      product_type: 'Ankara Top',
      attributes: {
        color: {
          value: 'Yellow',
          provenance: 'explicitly_supplied',
          normalization_state: 'exact',
          raw_source: 'yellow',
        },
        size: {
          value: ['M', 'L'],
          provenance: 'explicitly_supplied',
          normalization_state: 'unresolved',
          raw_source: 'M/L',
        },
      },
      ambiguities_detected: [
        {
          field: 'size',
          raw_token: 'M/L',
          possible_values: ['M', 'L'],
          action_taken: 'retained_all',
        },
      ],
      missing_specifications: ['care_instructions'],
      normalized_tags: ['ankara top', 'african wear'],
      suggested_description: {
        text: 'Vibrant yellow Ankara top in size M/L.',
        style: 'professional',
        grounded_on_facts_only: true,
      },
      listing_quality: {
        score: 82,
        grade: 'B',
        breakdown: {
          title_clarity: 20,
          attribute_completeness: 32,
          description_depth: 15,
          tag_coverage: 15,
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockEnrichment,
    } as Response);

    const result = await enrichProductCatalog({
      vendorText: 'Ankara ladies top, yellow, size M/L',
    });

    expect(result.task).toBe('catalog_enrichment');
    expect(result.status).toBe('success');
    expect(result.attributes.size.value).toEqual(['M', 'L']);
    expect(result.attributes.size.normalization_state).toBe('unresolved');
    expect(result.listing_quality.score).toBe(63);
    expect(result.listing_quality.grade).toBe('C');
  });

  it('Engine 2: parses multilingual query with negative constraints and strict budget boundaries', async () => {
    const mockInterpretation: CommerceMindShoppingInterpretation = {
      task: 'shopping_intent',
      status: 'success',
      intent: 'product_search',
      detected_language: 'sheng',
      budget_constraint: {
        currency: 'KES',
        min_limit: null,
        max_limit: {
          amount: 4000,
          boundary: 'inclusive',
        },
      },
      filter_ast: {
        category: 'Footwear',
        subcategory: "Men's Footwear",
        clauses: [
          { field: 'category', operator: 'eq', value: 'Footwear' },
          { field: 'attributes.size', operator: 'contains', value: '42' },
          { field: 'attributes.material', operator: 'nin', value: ['Suede'] },
        ],
      },
      semantic_search_tokens: ['official', 'shoes'],
      clarification_prompt: null,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockInterpretation,
    } as Response);

    const result = await interpretShoppingQuery({
      query: 'Nahitaji official shoes size 42 zisizozidi 4k lakini sitaki za suede',
    });

    expect(result.task).toBe('shopping_intent');
    expect(result.detected_language).toBe('sheng');
    expect(result.budget_constraint.max_limit?.amount).toBe(4000);
    expect(result.budget_constraint.max_limit?.boundary).toBe('inclusive');

    const ninClause = result.filter_ast.clauses.find((c) => c.operator === 'nin');
    expect(ninClause).toBeDefined();
    expect(ninClause?.value).toEqual(['Suede']);
  });

  it('degrades gracefully to deterministic fallback when the remote inference service throws an HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    } as Response);

    const fallback = await enrichProductCatalog({ vendorText: 'Sample blue dress' });
    expect(fallback.task).toBe('catalog_enrichment');
    expect(fallback.status).toBe('low_confidence');
    expect(fallback.attributes.color.value).toBe('Blue');
  });
});

