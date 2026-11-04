import type {
  CommerceMindAttribute,
  CommerceMindAmbiguity,
  CommerceMindListingQuality,
} from '@/lib/types';

export interface QualityScoringInput {
  title: string;
  category?: string;
  subcategory?: string;
  description?: string;
  attributes?: Record<string, CommerceMindAttribute>;
  tags?: string[];
  ambiguities?: CommerceMindAmbiguity[];
}

/**
 * Deterministic Listing Quality Scorer
 * Transparent, rule-based mathematical scoring matrix (0 - 100).
 * Never relies on unverified or hallucinated LLM score numbers.
 *
 * Matrix:
 * - Title Clarity: Max 25 pts
 * - Attribute Completeness: Max 45 pts
 * - Description Depth: Max 15 pts
 * - Tag Coverage: Max 15 pts
 */
export function calculateListingQuality(input: QualityScoringInput): CommerceMindListingQuality {
  // 1. Title Clarity (Max 25)
  let titleClarity = 0;
  const cleanTitle = (input.title || '').trim();
  if (cleanTitle.length >= 15) titleClarity += 10;
  else if (cleanTitle.length >= 8) titleClarity += 5;

  // Has recognized product type or brand indicator
  const hasTypeOrBrand = /\b(shirt|dress|shoe|boot|bag|handbag|top|trouser|sneaker|belt|watch|ankara|kitenge)\b/i.test(cleanTitle);
  if (hasTypeOrBrand) titleClarity += 10;

  // Penalize ALL CAPS shouting
  const isShouting = cleanTitle.length > 5 && cleanTitle === cleanTitle.toUpperCase() && /[A-Z]/.test(cleanTitle);
  if (!isShouting) titleClarity += 5;

  // 2. Attribute Completeness (Max 45)
  let attributeCompleteness = 0;
  if (input.category && input.category.trim().length > 0) attributeCompleteness += 10;
  
  const attrs = input.attributes || {};
  if (attrs.color && attrs.color.value) attributeCompleteness += 10;
  if (attrs.size && attrs.size.value) attributeCompleteness += 15;
  if (attrs.material && attrs.material.value) attributeCompleteness += 10;

  // Penalty for unresolved critical ambiguities
  const hasUnresolvedAmbiguity = (input.ambiguities || []).some(
    (a) => a.action_taken === 'retained_all' && a.field === 'size'
  );
  if (hasUnresolvedAmbiguity) {
    attributeCompleteness = Math.max(0, attributeCompleteness - 7);
  }

  // 3. Description Depth (Max 15)
  let descriptionDepth = 0;
  const cleanDesc = (input.description || '').trim();
  const wordCount = cleanDesc.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 25) descriptionDepth += 10;
  else if (wordCount >= 10) descriptionDepth += 5;

  // Bonus for care/fit/style specification
  const hasPracticalDetail = /\b(fit|wash|clean|cotton|leather|lining|inches|cm|pocket|compartment)\b/i.test(cleanDesc);
  if (hasPracticalDetail) descriptionDepth += 5;

  // 4. Tag Coverage (Max 15)
  let tagCoverage = 0;
  const tagList = (input.tags || []).filter(Boolean);
  if (tagList.length >= 4) tagCoverage += 10;
  else if (tagList.length >= 2) tagCoverage += 5;

  // Quality search keyword presence
  const hasSearchKeyword = tagList.some((t) => t.length >= 4);
  if (hasSearchKeyword) tagCoverage += 5;

  const totalScore = Math.min(100, titleClarity + attributeCompleteness + descriptionDepth + tagCoverage);

  let grade: 'A' | 'B' | 'C' | 'D' | 'Incomplete' = 'D';
  if (totalScore >= 90) grade = 'A';
  else if (totalScore >= 75) grade = 'B';
  else if (totalScore >= 60) grade = 'C';
  else if (totalScore >= 40) grade = 'D';
  else grade = 'Incomplete';

  return {
    score: totalScore,
    grade,
    breakdown: {
      title_clarity: titleClarity,
      attribute_completeness: attributeCompleteness,
      description_depth: descriptionDepth,
      tag_coverage: tagCoverage,
    },
  };
}
