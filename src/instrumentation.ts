/**
 * Next.js server instrumentation hook.
 * Runs once when the Node.js server starts (not in the browser, not on the edge).
 * Initialises shared infrastructure: Redis connection (distributed cache + rate
 * limiting) and any server-global services.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeRedis } = await import('@/lib/cache-service');
    const { initWsPublisher } = await import('@/lib/ws-events');
    await initializeRedis();
    await initWsPublisher();
  }
}
