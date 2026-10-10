import client from 'prom-client';

const register = client.register;

// Collect default metrics once. The guard is shared with src/lib/metrics.ts so
// default metrics are never registered twice in one process.
if (!globalThis.__prometheusMetricsInitialized) {
  client.collectDefaultMetrics({ timeout: 5000 });
  globalThis.__prometheusMetricsInitialized = true;
}

export async function GET() {
  const metrics = await register.metrics();
  return new Response(metrics, {
    status: 200,
    headers: { 'Content-Type': register.contentType },
  });
}
