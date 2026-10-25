/**
 * Server-Side GA4 Measurement Protocol Service
 * Dispatches validated e-commerce events to Google Analytics 4.
 * Features strict debug endpoint validation and non-2xx error classification.
 */

import type { GA4PurchasePayload } from '@/lib/analytics-types';

export interface DispatchResult {
  accepted: boolean;
  statusCode: number;
  validationMessages?: Array<{ fieldPath: string; description: string }>;
  isTransient: boolean;
  errorMessage?: string;
}

/**
 * Validates and dispatches a GA4 Purchase event.
 * In development or testing, can target the debug endpoint to inspect Google schema validation.
 */
export async function dispatchGA4Purchase(
  payload: GA4PurchasePayload,
  options: {
    useDebugEndpoint?: boolean;
    timeoutMs?: number;
    apiSecret?: string;
    measurementId?: string;
  } = {}
): Promise<DispatchResult> {
  const measurementId =
    options.measurementId ||
    process.env.GA4_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  const apiSecret = options.apiSecret || process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    return {
      accepted: false,
      statusCode: 400,
      isTransient: false,
      errorMessage: 'Missing GA4_MEASUREMENT_ID or GA4_API_SECRET configuration',
    };
  }

  // Pre-dispatch client_id validation
  if (!payload.client_id || typeof payload.client_id !== 'string' || payload.client_id.trim() === '') {
    return {
      accepted: false,
      statusCode: 400,
      isTransient: false,
      errorMessage: 'Invalid or missing client_id in Measurement Protocol payload',
    };
  }

  const endpointBase = options.useDebugEndpoint
    ? 'https://www.google-analytics.com/debug/mp/collect'
    : 'https://www.google-analytics.com/mp/collect';

  const url = `${endpointBase}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
  const timeoutMs = options.timeoutMs ?? 5000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    // Debug endpoint returns 200 with JSON validationMessages
    if (options.useDebugEndpoint) {
      const data = (await res.json().catch(() => ({}))) as {
        validationMessages?: Array<{ fieldPath: string; description: string }>;
      };
      const hasErrors = (data.validationMessages || []).length > 0;
      return {
        accepted: !hasErrors,
        statusCode: res.status,
        validationMessages: data.validationMessages,
        isTransient: false,
        errorMessage: hasErrors
          ? `GA4 validation failed: ${JSON.stringify(data.validationMessages)}`
          : undefined,
      };
    }

    // Production endpoint: 204 No Content is standard success
    if (res.status >= 200 && res.status < 300) {
      return {
        accepted: true,
        statusCode: res.status,
        isTransient: false,
      };
    }

    // 429 (Rate Limit) or 5xx (Google temporary outage) are transient
    const isTransient = res.status === 429 || res.status >= 500;
    return {
      accepted: false,
      statusCode: res.status,
      isTransient,
      errorMessage: `GA4 Measurement Protocol rejected with HTTP ${res.status}`,
    };
  } catch (err: any) {
    clearTimeout(timer);
    const isTimeout = err.name === 'AbortError' || err.code === 'ECONNRESET';
    return {
      accepted: false,
      statusCode: isTimeout ? 408 : 0,
      isTransient: true, // Network timeouts & connection losses are transient
      errorMessage: err.message || 'Unknown network error during GA4 dispatch',
    };
  }
}

