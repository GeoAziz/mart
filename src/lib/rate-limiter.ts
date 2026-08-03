/**
 * Sliding-window rate limiter backed by Redis when REDIS_URL / REDIS_HOST is
 * configured (production-safe on Vercel multi-instance deployments), with an
 * automatic in-process NodeCache fallback for local development.
 *
 * The Redis path uses INCR + EXPIRE which is atomic per Redis command — no
 * Lua script needed for a simple fixed-window approach.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { rateLimitIncr } from '@/lib/cache-service';

export interface RateLimitConfig {
  /** Window size in milliseconds */
  windowMs: number;
  /** Maximum requests allowed within the window */
  max: number;
}

/**
 * Presets:
 *   public:  100 req/min per IP  — browse/search endpoints
 *   auth:      5 req/min per IP  — login, signup
 *   orders:   20 req/min per UID — order creation
 *   payment:  10 req/min per IP  — payment-intent creation
 *   refund:   10 req/min per UID — refund submission
 */
export const rateLimitPresets = {
  public:  { windowMs: 60_000, max: 100 },
  auth:    { windowMs: 60_000, max: 5 },
  orders:  { windowMs: 60_000, max: 20 },
  payment: { windowMs: 60_000, max: 10 },
  refund:  { windowMs: 60_000, max: 10 },
} satisfies Record<string, RateLimitConfig>;

/**
 * Extract the best available identifier for the caller.
 * Prefers authenticated UID, then x-forwarded-for IP from Vercel/proxy.
 */
export function getClientKey(req: NextRequest, uid?: string): string {
  if (uid) return `rl:uid:${uid}`;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return `rl:ip:${forwarded.split(',')[0].trim()}`;
  return 'rl:ip:unknown';
}

function rateLimitHeaders(count: number, max: number, windowMs: number, resetAt: number) {
  const remaining = Math.max(0, max - count);
  return {
    'RateLimit-Limit': String(max),
    'RateLimit-Remaining': String(remaining),
    'RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
    ...(count > max ? { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) } : {}),
  };
}

/**
 * Apply rate limiting to a Next.js API route handler.
 * Returns a 429 NextResponse when the limit is exceeded, or `null` when allowed.
 *
 * Usage:
 *   const limited = await applyRateLimit(req, rateLimitPresets.public);
 *   if (limited) return limited;
 */
export async function applyRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  uid?: string,
): Promise<NextResponse | null> {
  const key = getClientKey(req, uid);
  const count = await rateLimitIncr(key, config.windowMs);
  const resetAt = Date.now() + config.windowMs;
  const headers = rateLimitHeaders(count, config.max, config.windowMs, resetAt);

  if (count > config.max) {
    return NextResponse.json(
      { message: 'Too many requests. Please try again later.' },
      { status: 429, headers },
    );
  }

  return null;
}
