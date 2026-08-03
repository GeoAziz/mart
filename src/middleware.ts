import { NextRequest, NextResponse } from 'next/server';
import { trackRequestMetrics } from '@/lib/metrics';

// Normalize route patterns to avoid metric cardinality explosion
function normalizeRoute(pathname: string): string {
  // Replace dynamic segments with placeholders
  return pathname
    .replace(/\/users\/\d+/g, '/users/[id]')
    .replace(/\/products\/\d+/g, '/products/[id]')
    .replace(/\/orders\/\d+/g, '/orders/[id]')
    .replace(/\/refunds\/\d+/g, '/refunds/[id]')
    .replace(/\/payouts\/\d+/g, '/payouts/[id]')
    .replace(/\/\d+/g, '/[id]');
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;

  // Skip metrics collection for metrics endpoint itself and health checks
  if (pathname === '/api/metrics' || pathname === '/api/health') {
    return NextResponse.next();
  }

  const startTime = performance.now();
  const normalizedRoute = normalizeRoute(pathname);

  // Clone the request to continue processing
  const response = NextResponse.next();

  // Store metadata for later tracking
  response.headers.set('x-request-method', method);
  response.headers.set('x-request-route', normalizedRoute);
  response.headers.set('x-request-start-time', startTime.toString());

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
