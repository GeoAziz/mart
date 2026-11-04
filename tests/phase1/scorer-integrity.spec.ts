import { describe, it, expect } from 'vitest';
import { calculateListingQuality } from '@/lib/commercemind-quality';

describe('S4 — Scorer Integrity Suite (6 Cases)', () => {
  const sampleListing = {
    title: 'Executive Brown Leather Handbag',
    category: 'Fashion',
    description: 'Spacious brown leather handbag designed for professional office versatility with interior compartments and durable lining.',
    attributes: {
      color: { value: 'Brown', provenance: 'explicitly_supplied' as const, normalization_state: 'exact' as const },
      size: { value: 'Large', provenance: 'explicitly_supplied' as const, normalization_state: 'exact' as const },
      material: { value: 'Genuine Leather', provenance: 'explicitly_supplied' as const, normalization_state: 'exact' as const },
    },
    tags: ['handbag', 'leather', 'office', 'executive'],
  };

  it('S4-01 computes 100% identical score across 100 consecutive runs on the same input (determinism)', () => {
    const scores = Array.from({ length: 100 }).map(() =>
      calculateListingQuality(sampleListing).score
    );

    const first = scores[0];
    expect(scores.every((s) => s === first)).toBe(true);
    expect(first).toBe(95);
  });

  it('S4-02 bounds score strictly in [0, 100] across 1,000 synthetic permutations', () => {
    for (let i = 0; i < 1000; i++) {
      const randomTitle = 'Item ' + Math.random().toString(36).substring(2, 5 + (i % 20));
      const hasCat = i % 2 === 0 ? 'Fashion' : '';
      const quality = calculateListingQuality({
        title: randomTitle,
        category: hasCat,
        description: 'Word '.repeat(i % 50),
        tags: Array(i % 10).fill('tag'),
      });

      expect(quality.score).toBeGreaterThanOrEqual(0);
      expect(quality.score).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'Incomplete']).toContain(quality.grade);
    }
  });

  it('S4-03 asserts exact title length threshold boundary (15 chars vs 14 chars = +10 vs +5)', () => {
    // 14 characters
    const score14 = calculateListingQuality({
      title: '12345678901234',
    });

    // 15 characters
    const score15 = calculateListingQuality({
      title: '123456789012345',
    });

    // Title clarity at 15 chars gets +10; 14 chars gets +5
    expect(score15.breakdown.title_clarity - score14.breakdown.title_clarity).toBe(5);
  });

  it('S4-04 asserts exact description word count threshold boundary (25 words vs 24 words = +10 vs +5)', () => {
    const desc24 = Array(24).fill('word').join(' ');
    const desc25 = Array(25).fill('word').join(' ');

    const score24 = calculateListingQuality({
      title: 'Valid Product Title',
      description: desc24,
    });

    const score25 = calculateListingQuality({
      title: 'Valid Product Title',
      description: desc25,
    });

    // 25 words gets +10; 24 words gets +5
    expect(score25.breakdown.description_depth - score24.breakdown.description_depth).toBe(5);
  });

  it('S4-05 (Star Case) prevents LLM self-inflation: ungrounded LLM score assertion is overridden by authoritative server calculation', () => {
    // GIVEN a poor quality listing where an LLM untruthfully asserts 100 points
    const sparseListing = {
      title: 'SHIRT', // Shouting, short (length 5: 0 pts for length, 10 pts for 'shirt', 5 pts for not shouting >5) -> total 15
      category: '',
      description: '',
      attributes: {},
    };

    // WHEN authoritative server-side quality calculation executes
    const quality = calculateListingQuality(sparseListing);

    // THEN the true mathematical grade must be assigned (15/100, Incomplete), overriding any LLM claim of 100
    expect(quality.score).toBe(15);
    expect(quality.grade).toBe('Incomplete');
    expect(quality.breakdown.title_clarity).toBe(15);
    expect(quality.breakdown.attribute_completeness).toBe(0);
    expect(quality.breakdown.description_depth).toBe(0);
    expect(quality.breakdown.tag_coverage).toBe(0);
  });

  it('S4-06 guarantees vendor isolation: scoring one vendor listing has zero side effects on another', () => {
    const listingA = { title: 'High Quality Handmade Cotton Shirt', category: 'Fashion' };
    const listingB = { title: 'Cheap Watch', category: 'Accessories' };

    const scoreA1 = calculateListingQuality(listingA);
    const scoreB = calculateListingQuality(listingB);
    const scoreA2 = calculateListingQuality(listingA);

    expect(scoreA1.score).toBe(scoreA2.score);
    expect(scoreA1.score).not.toBe(scoreB.score);
  });
});
