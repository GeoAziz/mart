import client from 'prom-client';

// Initialize if not already done
if (!globalThis.__prometheusMetricsInitialized) {
  client.collectDefaultMetrics({ timeout: 5000 });
  globalThis.__prometheusMetricsInitialized = true;
}

// HTTP Request metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request latency in milliseconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total HTTP errors',
  labelNames: ['method', 'route', 'status'],
});

// Business metrics
export const ordersCreated = new client.Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['vendor_id', 'status'],
});

export const productsUploaded = new client.Counter({
  name: 'products_uploaded_total',
  help: 'Total products uploaded',
  labelNames: ['vendor_id', 'status'],
});

export const paymentsProcessed = new client.Counter({
  name: 'payments_processed_total',
  help: 'Total payments processed',
  labelNames: ['method', 'status'],
});

export const cacheHitRate = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['key_prefix'],
});

export const cacheMissRate = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['key_prefix'],
});

export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_ms',
  help: 'Database query duration in milliseconds',
  labelNames: ['collection', 'operation'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000],
});

export const externalApiCalls = new client.Counter({
  name: 'external_api_calls_total',
  help: 'Total external API calls',
  labelNames: ['service', 'endpoint', 'status'],
});

export const queueDepth = new client.Gauge({
  name: 'queue_depth',
  help: 'Current depth of message queue',
  labelNames: ['queue_name'],
});

// Export register for use in /metrics endpoint
export const register = client.register;

// Helper to track request metrics
export function trackRequestMetrics(
  method: string,
  route: string,
  status: number,
  duration: number
) {
  httpRequestDuration.labels(method, route, status).observe(duration);
  httpRequestTotal.labels(method, route, status).inc();

  if (status >= 400) {
    httpRequestErrors.labels(method, route, status).inc();
  }
}

// Helper to track database metrics
export function trackDbQuery(collection: string, operation: string, duration: number) {
  dbQueryDuration.labels(collection, operation).observe(duration);
}

// Helper to track cache metrics
export function trackCacheHit(keyPrefix: string) {
  cacheHitRate.labels(keyPrefix).inc();
}

export function trackCacheMiss(keyPrefix: string) {
  cacheMissRate.labels(keyPrefix).inc();
}

// Helper to track business events
export function trackOrderCreated(vendorId: string, status: string = 'pending') {
  ordersCreated.labels(vendorId, status).inc();
}

export function trackProductUploaded(vendorId: string, status: string = 'pending') {
  productsUploaded.labels(vendorId, status).inc();
}

export function trackPaymentProcessed(method: string, status: string = 'success') {
  paymentsProcessed.labels(method, status).inc();
}

export function trackExternalApiCall(
  service: string,
  endpoint: string,
  status: string = 'success'
) {
  externalApiCalls.labels(service, endpoint, status).inc();
}

export function updateQueueDepth(queueName: string, depth: number) {
  queueDepth.labels(queueName).set(depth);
}
