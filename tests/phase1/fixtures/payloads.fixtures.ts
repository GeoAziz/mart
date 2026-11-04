export const VALID_ENVELOPE = {
  schema_version: '1.1.0',
  model_id: 'commercemind-qwen2.5-3b-qlora',
  prompt_version: '2026-11-prompt-v1',
  timestamp: 1730680000000,
  payload: {
    category: 'Fashion',
    subcategory: 'Shoes',
    attributes: {
      color: { value: 'Black', provenance: 'explicitly_supplied' },
    },
  },
} as const;

export function createPoisonedEnvelopes(baseTimestamp = Date.now()) {
  const base = {
    ...VALID_ENVELOPE,
    timestamp: baseTimestamp,
  };

  const withoutVersion = { ...base };
  delete (withoutVersion as { schema_version?: string }).schema_version;

  return {
    missingVersion: withoutVersion,
    oldVersion: { ...base, schema_version: '0.0.1' },
    staleTimestamp: { ...base, timestamp: baseTimestamp - 3_600_000 },
    futureTimestamp: { ...base, timestamp: baseTimestamp + 3_600_000 },
    stringTimestamp: { ...base, timestamp: String(baseTimestamp) as unknown as number },
    adminEscape: { ...base, admin: true },
    nullByte: { ...base, payload: { ...base.payload, x: '\u0000' } },
    fakeProvenance: {
      ...base,
      payload: {
        ...base.payload,
        attributes: {
          color: { value: 'Black', provenance: 'verified_by_ai' },
        },
      },
    },
    llmSetsPrice: {
      ...base,
      payload: {
        ...base.payload,
        price: 1,
        stock: 99999,
        quality_score: 100,
      },
    },
  };
}
