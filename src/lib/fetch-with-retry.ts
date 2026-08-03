/**
 * Exponential-backoff retry wrapper for external HTTP calls (Stripe, PayPal).
 *
 * Retries on:
 *   - Network / DNS errors (fetch throws)
 *   - 429 Too Many Requests (respects Retry-After header)
 *   - 5xx server errors from the gateway
 *
 * Does NOT retry on 4xx client errors (bad request, auth failure, etc.) since
 * retrying those will not help and may cause double-charges.
 */

export interface RetryOptions {
  /** Maximum number of attempts (initial + retries). Default: 3 */
  maxAttempts?: number;
  /** Initial backoff in ms before first retry. Default: 500 */
  initialDelayMs?: number;
  /** Backoff multiplier per attempt. Default: 2 */
  backoffFactor?: number;
  /** Maximum delay cap in ms. Default: 10_000 */
  maxDelayMs?: number;
}

const DEFAULT_OPTS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 500,
  backoffFactor: 2,
  maxDelayMs: 10_000,
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Drop-in replacement for `fetch` with automatic retry + exponential backoff.
 * Throws after all attempts are exhausted.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const opts = { ...DEFAULT_OPTS, ...options };
  let lastError: unknown;
  let delayMs = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const response = await fetch(url, init);

      if (!isRetryable(response.status) || attempt === opts.maxAttempts) {
        return response;
      }

      // Honour Retry-After header from 429 responses
      const retryAfter = response.headers.get('Retry-After');
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.min(delayMs, opts.maxDelayMs);

      console.warn(
        `[fetchWithRetry] ${response.status} on ${url} — attempt ${attempt}/${opts.maxAttempts}, retrying in ${waitMs}ms`
      );
      await sleep(waitMs);
      delayMs = Math.min(delayMs * opts.backoffFactor, opts.maxDelayMs);
    } catch (err) {
      lastError = err;
      if (attempt === opts.maxAttempts) break;
      const waitMs = Math.min(delayMs, opts.maxDelayMs);
      console.warn(
        `[fetchWithRetry] Network error on ${url} — attempt ${attempt}/${opts.maxAttempts}, retrying in ${waitMs}ms:`,
        err
      );
      await sleep(waitMs);
      delayMs = Math.min(delayMs * opts.backoffFactor, opts.maxDelayMs);
    }
  }

  throw lastError ?? new Error(`fetchWithRetry: all ${opts.maxAttempts} attempts failed for ${url}`);
}
