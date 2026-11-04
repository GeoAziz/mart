import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateAndSanitizeEnvelope,
  EnvelopeValidationError,
} from '@/lib/commercemind-envelope';
import {
  VALID_ENVELOPE,
  createPoisonedEnvelopes,
} from './fixtures/payloads.fixtures';

describe('S2 — Contract Boundary Suite (12 Cases)', () => {
  const baseTime = 1730680000000;
  let poisoned: ReturnType<typeof createPoisonedEnvelopes>;

  beforeEach(() => {
    poisoned = createPoisonedEnvelopes(baseTime);
  });

  it('S2-01 rejects envelope missing schema_version', () => {
    expect(() =>
      validateAndSanitizeEnvelope(poisoned.missingVersion, { currentTime: baseTime })
    ).toThrow(EnvelopeValidationError);
  });

  it('S2-02 rejects unsupported/outdated schema_version ("0.0.1")', () => {
    expect(() =>
      validateAndSanitizeEnvelope(poisoned.oldVersion, { currentTime: baseTime })
    ).toThrow(EnvelopeValidationError);
  });

  it('S2-03 rejects stale timestamp (> 5 minutes past)', () => {
    expect(() =>
      validateAndSanitizeEnvelope(poisoned.staleTimestamp, { currentTime: baseTime })
    ).toThrow(EnvelopeValidationError);
  });

  it('S2-04 rejects future timestamp (> 5 minutes future)', () => {
    expect(() =>
      validateAndSanitizeEnvelope(poisoned.futureTimestamp, { currentTime: baseTime })
    ).toThrow(EnvelopeValidationError);
  });

  it('S2-05 rejects timestamp serialized as string instead of number', () => {
    expect(() =>
      validateAndSanitizeEnvelope(poisoned.stringTimestamp, { currentTime: baseTime })
    ).toThrow(EnvelopeValidationError);
  });

  it('S2-06 rejects unauthorized top-level property injection (e.g. {"admin": true})', () => {
    expect(() =>
      validateAndSanitizeEnvelope(poisoned.adminEscape, { currentTime: baseTime })
    ).toThrow(EnvelopeValidationError);
  });

  it('S2-07 rejects oversized payload exceeding 1 MB limit', () => {
    const hugePayload = {
      ...VALID_ENVELOPE,
      timestamp: baseTime,
      payload: {
        giantString: 'A'.repeat(1024 * 1024 + 100),
      },
    };
    expect(() =>
      validateAndSanitizeEnvelope(hugePayload, { currentTime: baseTime })
    ).toThrow(EnvelopeValidationError);
  });

  it('S2-08 rejects null byte (\\u0000) injection attack in payload text', () => {
    expect(() =>
      validateAndSanitizeEnvelope(poisoned.nullByte, { currentTime: baseTime })
    ).toThrow(EnvelopeValidationError);
  });

  it('S2-09 rejects invalid or hallucinated provenance string ("verified_by_ai")', () => {
    expect(() =>
      validateAndSanitizeEnvelope(poisoned.fakeProvenance, { currentTime: baseTime })
    ).toThrow(EnvelopeValidationError);
  });

  it('S2-10 accepts valid envelope within allowed timestamp tolerance', () => {
    const envelope = {
      ...VALID_ENVELOPE,
      timestamp: baseTime - 60_000, // 1 minute old (well within ±5 min)
    };
    const result = validateAndSanitizeEnvelope(envelope, { currentTime: baseTime });
    expect(result.schema_version).toBe('1.1.0');
    expect(result.model_id).toBe('commercemind-qwen2.5-3b-qlora');
    expect(result.commercialFieldsStripped).toHaveLength(0);
  });

  it('S2-11 rejects malformed non-object envelope structures (null, array, string)', () => {
    expect(() => validateAndSanitizeEnvelope(null)).toThrow(EnvelopeValidationError);
    expect(() => validateAndSanitizeEnvelope([])).toThrow(EnvelopeValidationError);
    expect(() => validateAndSanitizeEnvelope('invalid_json')).toThrow(EnvelopeValidationError);
  });

  it('S2-12 (Star Case) strips unauthorized commercial mutations (price, stock, score) asserted by LLM', () => {
    // GIVEN an LLM payload maliciously asserting commercial truths: price=1, stock=99999, quality_score=100
    const malicious = poisoned.llmSetsPrice;

    // WHEN validated at the contract boundary
    const sanitized = validateAndSanitizeEnvelope(malicious, { currentTime: baseTime });

    // THEN commercial fields must be stripped completely from the sanitized payload
    expect(sanitized.commercialFieldsStripped).toContain('price');
    expect(sanitized.commercialFieldsStripped).toContain('stock');
    expect(sanitized.commercialFieldsStripped).toContain('quality_score');

    const payload = sanitized.payload as Record<string, unknown>;
    expect(payload.price).toBeUndefined();
    expect(payload.stock).toBeUndefined();
    expect(payload.quality_score).toBeUndefined();

    // Legitimate advisory fields are preserved intact
    expect(payload.category).toBe('Fashion');
    expect(payload.subcategory).toBe('Shoes');
  });
});

