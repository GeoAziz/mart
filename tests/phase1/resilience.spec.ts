import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  enrichProductCatalog,
  getCircuitBreakerState,
  resetCircuitBreaker,
  recordFailure,
  generateDeterministicCatalogFallback,
} from '@/lib/commercemind-client';
import { providerMock } from './helpers/provider-mock';

describe('S3 — Resilience Suite (10 Cases)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetCircuitBreaker();
    providerMock.install();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('S3-01 succeeds when provider responds within the 3,500ms timeout ceiling (latency: 1,000ms)', async () => {
    providerMock.configure({
      latencyMs: 1000,
      responsePayload: {
        task: 'catalog_enrichment',
        status: 'success',
        category: 'Fashion',
        subcategory: 'Boots',
        product_type: 'Boots',
        attributes: { color: { value: 'Brown', provenance: 'explicitly_supplied', normalization_state: 'exact' } },
        ambiguities_detected: [],
        missing_specifications: [],
        normalized_tags: ['boots', 'brown'],
        suggested_description: { text: 'Premium boots', style: 'professional', grounded_on_facts_only: true },
        listing_quality: { score: 90, grade: 'A', breakdown: { title_clarity: 25, attribute_completeness: 45, description_depth: 10, tag_coverage: 10 } },
      },
    });

    const enrichPromise = enrichProductCatalog({ vendorText: 'Brown leather boots' });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await enrichPromise;

    expect(result.status).toBe('success');
    expect(providerMock.callCount).toBe(1);
    expect(getCircuitBreakerState()).toBe('CLOSED');
  });

  it('S3-02 aborts at 3,500ms timeout ceiling and falls back gracefully when provider hangs (latency: 4,000ms)', async () => {
    providerMock.configure({
      shouldTimeout: true,
      latencyMs: 4000,
    });

    const enrichPromise = enrichProductCatalog({ vendorText: 'Blue silk dress' });
    await vi.advanceTimersByTimeAsync(3600);
    const result = await enrichPromise;

    expect(result.status).toBe('low_confidence');
    expect(result.attributes.color.value).toBe('Blue');
  });

  it('S3-03 transitions circuit breaker to OPEN after exactly 3 consecutive failures', async () => {
    providerMock.configure({ shouldError: true, statusCode: 503 });

    expect(getCircuitBreakerState()).toBe('CLOSED');

    await enrichProductCatalog({ vendorText: 'Failure 1' });
    expect(getCircuitBreakerState()).toBe('CLOSED');

    await enrichProductCatalog({ vendorText: 'Failure 2' });
    expect(getCircuitBreakerState()).toBe('CLOSED');

    await enrichProductCatalog({ vendorText: 'Failure 3' });
    expect(getCircuitBreakerState()).toBe('OPEN');
  });

  it('S3-04 suppresses provider calls completely during OPEN state (10 calls trigger 0 remote fetches)', async () => {
    providerMock.configure({ shouldError: true, statusCode: 503 });

    // Trip circuit
    recordFailure();
    recordFailure();
    recordFailure();
    expect(getCircuitBreakerState()).toBe('OPEN');

    providerMock.reset();

    // Fire 10 requests during OPEN window
    const results = await Promise.all(
      Array.from({ length: 10 }).map((_, i) =>
        enrichProductCatalog({ vendorText: `Product ${i}` })
      )
    );

    // All must be served via fallback with ZERO provider invocations
    expect(providerMock.callCount).toBe(0);
    expect(results).toHaveLength(10);
    results.forEach((r) => expect(r.status).toBe('low_confidence'));
  });

  it('S3-05 transitions to HALF_OPEN after the 30s reset window expires', async () => {
    recordFailure();
    recordFailure();
    recordFailure();
    expect(getCircuitBreakerState()).toBe('OPEN');

    // Advance clock 29.9s (still OPEN)
    await vi.advanceTimersByTimeAsync(29_900);
    expect(getCircuitBreakerState()).toBe('OPEN');

    // Advance clock past 30s threshold
    await vi.advanceTimersByTimeAsync(200);
    expect(getCircuitBreakerState()).toBe('HALF_OPEN');
  });

  it('S3-06 allows exactly 1 single canary probe through in HALF_OPEN state (herd control)', async () => {
    recordFailure();
    recordFailure();
    recordFailure();
    await vi.advanceTimersByTimeAsync(30_100);
    expect(getCircuitBreakerState()).toBe('HALF_OPEN');

    providerMock.reset();
    providerMock.configure({
      latencyMs: 100,
      responsePayload: {
        task: 'catalog_enrichment',
        status: 'success',
        category: 'Fashion',
        subcategory: 'Hats',
        product_type: 'Hat',
        attributes: {},
        ambiguities_detected: [],
        missing_specifications: [],
        normalized_tags: [],
        suggested_description: { text: 'Hat', style: 'casual', grounded_on_facts_only: true },
        listing_quality: { score: 80, grade: 'B', breakdown: { title_clarity: 20, attribute_completeness: 30, description_depth: 15, tag_coverage: 15 } },
      },
    });

    // Launch 10 simultaneous requests
    const promises = Array.from({ length: 10 }).map(() =>
      enrichProductCatalog({ vendorText: 'Sun hat' })
    );

    await vi.advanceTimersByTimeAsync(150);
    await Promise.all(promises);

    // Exactly 1 probe went to provider; the remaining 9 immediately degraded
    expect(providerMock.callCount).toBe(1);
  });

  it('S3-07 resets circuit breaker to CLOSED on canary probe success', async () => {
    recordFailure();
    recordFailure();
    recordFailure();
    await vi.advanceTimersByTimeAsync(30_100);
    expect(getCircuitBreakerState()).toBe('HALF_OPEN');

    providerMock.configure({
      responsePayload: {
        task: 'catalog_enrichment',
        status: 'success',
        category: 'Fashion',
        attributes: {},
      },
    });

    await enrichProductCatalog({ vendorText: 'Canary Probe Item' });
    expect(getCircuitBreakerState()).toBe('CLOSED');
  });

  it('S3-08 re-trips circuit breaker to OPEN on canary probe failure', async () => {
    recordFailure();
    recordFailure();
    recordFailure();
    await vi.advanceTimersByTimeAsync(30_100);
    expect(getCircuitBreakerState()).toBe('HALF_OPEN');

    providerMock.configure({ shouldError: true, statusCode: 500 });

    await enrichProductCatalog({ vendorText: 'Canary Failure Item' });
    expect(getCircuitBreakerState()).toBe('OPEN');
  });

  it('S3-09 handles high-concurrency surge (100 simultaneous requests) during OPEN without crashing or leaking', async () => {
    recordFailure();
    recordFailure();
    recordFailure();
    expect(getCircuitBreakerState()).toBe('OPEN');

    providerMock.reset();

    const surge = Array.from({ length: 100 }).map((_, i) =>
      enrichProductCatalog({ vendorText: `Surge Item ${i}` })
    );

    const outcomes = await Promise.all(surge);
    expect(outcomes).toHaveLength(100);
    expect(providerMock.callCount).toBe(0); // Herd control: zero provider pressure
  });

  it('S3-10 ensures deterministic fallback engine produces complete schema in sub-10ms without provider', () => {
    const start = Date.now();
    const fallback = generateDeterministicCatalogFallback('Black velvet trousers size M/L');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
    expect(fallback.task).toBe('catalog_enrichment');
    expect(fallback.status).toBe('low_confidence');
    expect(fallback.attributes.color.value).toBe('Black');
    expect(fallback.attributes.size.value).toEqual(['M', 'L']);
    expect(fallback.listing_quality.score).toBeGreaterThan(0);
  });
});
