/**
 * CommerceMind Envelope Validation Layer
 * Enforces:
 * - Schema version and model/prompt version presence and support
 * - Timestamp skew tolerance (default ±5 min = 300,000ms)
 * - Additional property restrictions (rejects admin escapes or extra unauthorized keys)
 * - Maximum payload size checks (1MB)
 * - Null byte sanitization (\u0000)
 * - Strict provenance enum checks
 * - Commercial truth safeguarding (price, stock, quality score cannot be self-asserted by LLM)
 */

export class EnvelopeValidationError extends Error {
  constructor(message: string) {
    super(`[EnvelopeValidation] ${message}`);
    this.name = 'EnvelopeValidationError';
  }
}

export const SUPPORTED_SCHEMA_VERSIONS = new Set(['1.1.0', '1.0.0']);
export const ALLOWED_PROVENANCES = new Set(['explicitly_supplied', 'normalized', 'inferred', 'unknown']);
export const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB
export const TIMESTAMP_SKEW_TOLERANCE_MS = 5 * 60 * 1000; // ±5 minutes

export interface CommerceMindEnvelope<T = Record<string, unknown>> {
  schema_version: string;
  model_id: string;
  prompt_version: string;
  timestamp: number;
  payload: T;
  [key: string]: unknown;
}

export interface SanitizedEnvelopeOutput<T = Record<string, unknown>> {
  schema_version: string;
  model_id: string;
  prompt_version: string;
  timestamp: number;
  payload: T;
  commercialFieldsStripped: string[];
}

export function validateAndSanitizeEnvelope<T extends Record<string, unknown>>(
  rawEnvelope: unknown,
  options: {
    currentTime?: number;
    maxPayloadBytes?: number;
    skewToleranceMs?: number;
  } = {}
): SanitizedEnvelopeOutput<T> {
  const now = options.currentTime ?? Date.now();
  const maxBytes = options.maxPayloadBytes ?? MAX_PAYLOAD_BYTES;
  const skewTolerance = options.skewToleranceMs ?? TIMESTAMP_SKEW_TOLERANCE_MS;

  // 1. Ingress size and object structure validation
  if (!rawEnvelope || typeof rawEnvelope !== 'object' || Array.isArray(rawEnvelope)) {
    throw new EnvelopeValidationError('Envelope must be a non-null object');
  }

  const serialized = JSON.stringify(rawEnvelope);
  if (Buffer.byteLength(serialized, 'utf8') > maxBytes) {
    throw new EnvelopeValidationError(`Envelope size exceeds maximum limit of ${maxBytes} bytes`);
  }

  // Reject null byte injection
  if (serialized.includes('\\u0000') || serialized.includes('\0')) {
    throw new EnvelopeValidationError('Null byte character (\\u0000) detected in payload');
  }

  const env = rawEnvelope as Record<string, unknown>;

  // 2. Strict Top-Level Field Check (Rejects unauthorized fields like {"admin": true})
  const allowedTopLevelKeys = new Set(['schema_version', 'model_id', 'prompt_version', 'timestamp', 'payload']);
  for (const key of Object.keys(env)) {
    if (!allowedTopLevelKeys.has(key)) {
      throw new EnvelopeValidationError(`Disallowed top-level envelope property: "${key}"`);
    }
  }

  // 3. Schema & Model Version Validation
  if (!env.schema_version || typeof env.schema_version !== 'string') {
    throw new EnvelopeValidationError('Missing or non-string "schema_version"');
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.has(env.schema_version)) {
    throw new EnvelopeValidationError(`Unsupported schema_version: "${env.schema_version}"`);
  }

  if (!env.model_id || typeof env.model_id !== 'string') {
    throw new EnvelopeValidationError('Missing or non-string "model_id"');
  }

  if (!env.prompt_version || typeof env.prompt_version !== 'string') {
    throw new EnvelopeValidationError('Missing or non-string "prompt_version"');
  }

  // 4. Timestamp & Skew Tolerance Validation
  if (typeof env.timestamp !== 'number' || !Number.isFinite(env.timestamp)) {
    throw new EnvelopeValidationError('Property "timestamp" must be a numeric millisecond timestamp');
  }

  const skew = Math.abs(env.timestamp - now);
  if (skew > skewTolerance) {
    throw new EnvelopeValidationError(
      `Timestamp skew (${skew}ms) exceeds allowed tolerance of ±${skewTolerance}ms`
    );
  }

  // 5. Payload Validation & Commercial Truth Guard
  if (!env.payload || typeof env.payload !== 'object' || Array.isArray(env.payload)) {
    throw new EnvelopeValidationError('Missing or invalid "payload" object in envelope');
  }

  const payloadCopy = JSON.parse(JSON.stringify(env.payload)) as Record<string, unknown>;
  const commercialFieldsStripped: string[] = [];

  // Protect commercial truths: LLM is strictly prohibited from asserting price, stock, or self-scoring
  const protectedCommercialFields = ['price', 'stock', 'quality_score', 'rating', 'vendorId', 'status'];
  for (const field of protectedCommercialFields) {
    if (field in payloadCopy) {
      delete payloadCopy[field];
      commercialFieldsStripped.push(field);
    }
  }

  // Provenance Enum Enforcement on attributes
  if (payloadCopy.provenance && !ALLOWED_PROVENANCES.has(String(payloadCopy.provenance))) {
    throw new EnvelopeValidationError(`Invalid provenance value: "${payloadCopy.provenance}"`);
  }

  if (payloadCopy.attributes && typeof payloadCopy.attributes === 'object') {
    for (const [attrName, attrVal] of Object.entries(payloadCopy.attributes as Record<string, unknown>)) {
      if (attrVal && typeof attrVal === 'object' && 'provenance' in (attrVal as Record<string, unknown>)) {
        const prov = (attrVal as { provenance?: unknown }).provenance;
        if (typeof prov === 'string' && !ALLOWED_PROVENANCES.has(prov)) {
          throw new EnvelopeValidationError(`Invalid provenance "${prov}" on attribute "${attrName}"`);
        }
      }
    }
  }

  return {
    schema_version: env.schema_version,
    model_id: env.model_id,
    prompt_version: env.prompt_version,
    timestamp: env.timestamp,
    payload: payloadCopy as T,
    commercialFieldsStripped,
  };
}
