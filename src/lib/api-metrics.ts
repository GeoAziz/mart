/**
 * Request-metrics wrapper for public (non-`withAuth`) API route handlers.
 *
 * `withAuth` already records metrics for authenticated routes; this wrapper
 * provides the same coverage for public routes (catalog, search, webhooks).
 * The route label is read from the middleware-stamped `x-request-route`
 * header (normalised), falling back to the raw pathname.
 */
import type { NextRequest, NextResponse } from 'next/server';
import { trackRequestMetrics } from '@/lib/metrics';

type HandlerContext = { params: any } | { params: Promise<any> } | undefined;

export function withRequestMetrics<T extends HandlerContext = undefined>(
  handler: (req: NextRequest, context: T) => Promise<NextResponse> | NextResponse,
) {
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    const start = performance.now();
    const route = req.headers.get('x-request-route') || req.nextUrl.pathname;
    try {
      const response = await handler(req, context);
      trackRequestMetrics(req.method, route, response.status, performance.now() - start);
      return response;
    } catch (error) {
      trackRequestMetrics(req.method, route, 500, performance.now() - start);
      throw error;
    }
  };
}
