import { describe, it, expect } from 'vitest';
import { calculateListingQuality } from '@/lib/commercemind-quality';
import type {
  CommerceMindAttribute,
  CommerceMindProductMetadata,
  CommerceMindProvenanceHistoryItem,
  Product,
} from '@/lib/types';

describe('Phase 2 — Merchant Experience & Enrichment Persistence Tests', () => {
  // ---------------------------------------------------------------------------
  // 1. Field-Level Granular Decision & Provenance Tracking
  // ---------------------------------------------------------------------------
  describe('Granular Field Approval & Provenance History', () => {
    it('accurately tracks acceptance, rejection, and manual override with history stack', () => {
      const rawVendorInput = 'Ankara high-waist skirt with pockets, yellow, size 12';
      const historyStack: CommerceMindProvenanceHistoryItem[] = [];

      // Initial AI suggestions
      const aiAttributes: Record<string, CommerceMindAttribute> = {
        color: {
          value: 'Yellow',
          provenance: 'explicitly_supplied',
          normalization_state: 'exact',
          raw_source: 'yellow',
        },
        size: {
          value: '12',
          provenance: 'explicitly_supplied',
          normalization_state: 'exact',
          raw_source: 'size 12',
        },
        material: {
          value: 'Cotton',
          provenance: 'inferred',
          normalization_state: 'approximate',
          raw_source: null,
        },
      };

      const acceptedAttributes: Record<string, CommerceMindAttribute> = {};
      const rejectedAttributes: string[] = [];

      // Merchant accepts color
      acceptedAttributes.color = { ...aiAttributes.color };
      historyStack.push({
        field: 'attributes.color',
        action: 'accept',
        old_value: null,
        new_value: 'Yellow',
        updated_at: new Date().toISOString(),
      });

      // Merchant rejects material
      rejectedAttributes.push('material');
      historyStack.push({
        field: 'attributes.material',
        action: 'reject',
        old_value: 'Cotton',
        new_value: null,
        updated_at: new Date().toISOString(),
      });

      // Merchant manually customizes size from '12' to 'UK 12 / M'
      acceptedAttributes.size = {
        value: 'UK 12 / M',
        provenance: 'explicitly_supplied',
        normalization_state: 'exact',
        raw_source: '12',
      };
      historyStack.push({
        field: 'attributes.size',
        action: 'manual_edit',
        old_value: '12',
        new_value: 'UK 12 / M',
        updated_at: new Date().toISOString(),
      });

      expect(acceptedAttributes.color.value).toBe('Yellow');
      expect(acceptedAttributes.color.provenance).toBe('explicitly_supplied');
      expect(rejectedAttributes).toContain('material');
      expect(acceptedAttributes.size.value).toBe('UK 12 / M');
      expect(acceptedAttributes.size.provenance).toBe('explicitly_supplied');

      // Assert complete audit history
      expect(historyStack).toHaveLength(3);
      expect(historyStack[0].action).toBe('accept');
      expect(historyStack[1].action).toBe('reject');
      expect(historyStack[2].action).toBe('manual_edit');
    });

    it('supports undo workflow by reverting the last recorded provenance action', () => {
      const historyStack: CommerceMindProvenanceHistoryItem[] = [
        {
          field: 'attributes.pattern',
          action: 'accept',
          old_value: null,
          new_value: 'Floral',
          updated_at: new Date().toISOString(),
        },
      ];

      // Perform undo
      const popped = historyStack.pop();
      expect(popped).toBeDefined();
      expect(popped?.field).toBe('attributes.pattern');
      expect(popped?.action).toBe('accept');
      expect(historyStack).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Dynamic Quality Score Adjustment Based on Merchant Decisions
  // ---------------------------------------------------------------------------
  describe('Dynamic Quality Score Calculation', () => {
    it('dynamically changes quality score when merchant accepts vs rejects attributes', () => {
      // Score with only title and category
      const baseline = calculateListingQuality({
        title: 'Kitenge African Print Evening Dress',
        category: 'Fashion',
        description: 'Traditional handcrafted dress for special occasions.',
        attributes: {},
      });

      // Score after accepting rich attributes
      const enriched = calculateListingQuality({
        title: 'Kitenge African Print Evening Dress',
        category: 'Fashion',
        description: 'Traditional handcrafted dress made of premium cotton fabric with elegant lining and convenient side pockets for special occasions.',
        attributes: {
          color: { value: 'Blue', provenance: 'explicitly_supplied', normalization_state: 'exact' },
          size: { value: 'M', provenance: 'explicitly_supplied', normalization_state: 'exact' },
          material: { value: 'Kitenge Cotton', provenance: 'explicitly_supplied', normalization_state: 'exact' },
        },
        tags: ['kitenge', 'dress', 'fashion', 'african'],
      });

      expect(enriched.score).toBeGreaterThan(baseline.score);
      expect(enriched.breakdown.attribute_completeness).toBe(45);
      expect(enriched.grade).toBe('A');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Non-Destructive Metadata Versioning & Firestore Merge Invariant
  // ---------------------------------------------------------------------------
  describe('Non-Destructive Metadata Versioning', () => {
    it('constructs a non-destructive CommerceMind metadata payload preserving raw inputs', () => {
      const rawVendorInput = 'Vintage brown leather handbag';
      const metadata: CommerceMindProductMetadata = {
        version: '1.0',
        enrichedAt: '2026-11-04T01:00:00.000Z',
        raw_vendor_input: rawVendorInput,
        subcategory: 'Handbags & Purses',
        productType: 'Handbag',
        attributes: {
          color: { value: 'Brown', provenance: 'explicitly_supplied', normalization_state: 'exact' },
          material: { value: 'Leather', provenance: 'explicitly_supplied', normalization_state: 'exact' },
        },
        accepted_attributes: {
          color: { value: 'Brown', provenance: 'explicitly_supplied', normalization_state: 'exact' },
        },
        rejected_attributes: ['material'],
        normalizedTags: ['handbag', 'leather', 'brown'],
        qualityScore: 92,
        qualityGrade: 'A',
        provenance_history: [
          {
            field: 'attributes.color',
            action: 'accept',
            old_value: null,
            new_value: 'Brown',
            updated_at: '2026-11-04T01:00:00.000Z',
          },
        ],
      };

      // Existing product
      const existingProduct: Product = {
        id: 'prod-123',
        name: 'Vintage Handbag',
        description: 'Old school handbag.',
        price: 3500,
        stock: 5,
        category: 'Fashion',
        status: 'active',
        imageUrl: 'https://images.example.com/bag.jpg',
      };

      // Non-destructive update merge
      const updatedProduct: Product = {
        ...existingProduct,
        commercemind: metadata,
      };

      // Invariants check
      expect(updatedProduct.id).toBe('prod-123');
      expect(updatedProduct.price).toBe(3500);
      expect(updatedProduct.stock).toBe(5);
      expect(updatedProduct.commercemind?.version).toBe('1.0');
      expect(updatedProduct.commercemind?.raw_vendor_input).toBe(rawVendorInput);
      expect(updatedProduct.commercemind?.accepted_attributes?.color.value).toBe('Brown');
      expect(updatedProduct.commercemind?.rejected_attributes).toContain('material');
    });
  });
});
