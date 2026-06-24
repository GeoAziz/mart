import client from 'prom-client';

const register = client.register;

// Collect default metrics once
if (!globalThis.__promMetricsInitialized) {
  client.collectDefaultMetrics({ timeout: 5000 });
  globalThis.__promMetricsInitialized = true;
}

export async function GET() {
  const metrics = await register.metrics();
  return new Response(metrics, {
    status: 200,
    headers: { 'Content-Type': register.contentType },
  });
}
