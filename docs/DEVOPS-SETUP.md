# DevOps Infrastructure Setup Guide

**Last Updated:** 2026-06-24  
**Purpose:** Complete local development environment with production-like infrastructure

## Quick Start

```bash
# 1. Clone and setup
git clone <repo>
cd mart
cp .env.example .env.local

# 2. Start everything
docker compose up -d

# 3. Verify services
docker compose ps
curl http://localhost:3000/api/health

# 4. Access dashboards
# Grafana: http://localhost:3001 (admin/admin)
# Prometheus: http://localhost:9090
# Firebase Emulator UI: http://localhost:4000
```

## Architecture Overview

### Services in docker-compose.yml

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Environment                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Next.js App │  │  WebSocket   │  │  Firebase    │      │
│  │   :3000      │  │   :3001      │  │   Emulator   │      │
│  └──────┬───────┘  └──────┬───────┘  │   :4000      │      │
│         │                 │          │   :9099      │      │
│         └─────────┬───────┴──────────┼──────────────┘      │
│                   │                  │                      │
│         ┌─────────▼──────────────────▼────────┐            │
│         │      Prometheus (metrics)            │            │
│         │         :9090                       │            │
│         └──────────────┬──────────────────────┘            │
│                        │                                   │
│         ┌──────────────▼──────────────────┐               │
│         │    Grafana (visualization)      │               │
│         │         :3001                   │               │
│         └───────────────────────────────┬─┘               │
│                                         │                  │
│  ┌──────────────┐  ┌────────────────────▼─────────────┐   │
│  │   LocalStack │  │         Redis Cache              │   │
│  │   (AWS)      │  │       (in-memory store)          │   │
│  │   :4566      │  │       :6379                      │   │
│  └──────────────┘  └─────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 1. Local Development Environment

### Starting Services

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f app

# Stop services
docker compose down

# Remove volumes (fresh start)
docker compose down -v
```

### Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| App | http://localhost:3000 | — |
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | — |
| Firebase Emulator | http://localhost:4000 | — |
| LocalStack | http://localhost:4566 | test/test |
| Redis | localhost:6379 | — |

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit and fill in:
- Firebase credentials
- Stripe/PayPal keys
- Google API key (for Genkit)

## 2. Monitoring & Observability

### Prometheus Metrics

Metrics are automatically collected from:

- **App metrics:** `/api/metrics` (Next.js)
- **Business metrics:** Orders, products, payments
- **Infrastructure:** Redis, LocalStack
- **Performance:** Request duration, error rates

### Key Metrics to Monitor

```promql
# Request rate (requests/sec)
rate(http_requests_total[5m])

# Error rate
rate(http_request_errors_total[5m])

# Request latency (p95)
histogram_quantile(0.95, http_request_duration_ms)

# Cache hit rate
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))

# Orders created per hour
increase(orders_created_total[1h])

# Queue depth
queue_depth
```

### Grafana Dashboards

Pre-configured dashboard: **ZilaCart App Performance**

Available panels:
- Request Rate
- Error Rate
- Request Duration (p95)
- Cache Hit Rate
- Orders Created
- Products Uploaded
- Queue Depth
- Database Query Duration
- Payment Success Rate
- External API Calls

**Access:** http://localhost:3001/d/app-performance

### Creating Custom Dashboards

1. Go to http://localhost:3001
2. Click "+" → "Dashboard"
3. Click "Add a new panel"
4. Select "Prometheus" as data source
5. Write PromQL query
6. Save

Example PromQL queries:
```promql
# API latency by route
histogram_quantile(0.95, rate(http_request_duration_ms[5m]))

# Error rate by status code
rate(http_request_errors_total{status=~"5.."}[5m])

# Vendor product uploads
increase(products_uploaded_total[24h])
```

## 3. Load Testing with k6

### Running Load Tests

```bash
# Basic test (50 VUs, 5 minutes)
./scripts/run-load-test.sh

# Custom parameters
./scripts/run-load-test.sh 100 10m http://localhost:3000

# Parameters:
#   VUs (Virtual Users): 50 (default)
#   Duration: 5m (default)
#   Base URL: http://localhost:3000 (default)
```

### Load Test Scenarios

The k6 script tests realistic user workflows:

1. **Browse Products (40%)** - GET /api/products
2. **Search Products (30%)** - GET /api/search
3. **Vendor Upload (20%)** - POST /api/vendors/me/products
4. **Place Order (10%)** - POST /api/orders

### Load Test Thresholds

```
HTTP Response Time:
  p95: < 500ms ✓
  p99: < 1000ms ✓

Error Rate:
  < 10% (failure rate)
  < 5% (error rate)

Request Volume:
  1000+ requests/sec sustained
```

### Analyzing Results

```bash
# View results in Grafana
# Dashboard: ZilaCart App Performance
# Time range: Last 30 minutes

# Export JSON results
ls load-test-results/*/results.json

# Parse with jq
jq '.data.result' load-test-results/*/results.json | head -20
```

### Load Test Report

After running tests, check:

1. **Grafana Dashboard**
   - Request rate vs errors
   - Latency percentiles
   - Resource utilization

2. **Prometheus Alerts**
   - High error rate
   - High latency
   - High queue depth

3. **App Logs**
   ```bash
   docker logs mart-app | grep -i error | tail -20
   ```

## 4. AWS/LocalStack Integration

### LocalStack Services

Pre-configured services:
- **S3** - File storage (mart-uploads, mart-assets)
- **DynamoDB** - NoSQL database (sessions, cache)
- **SQS** - Message queues (orders, products, payments)
- **SNS** - Notifications
- **API Gateway** - API routing

### Queue Operations

#### Enqueue a Message

```typescript
import { enqueueOrder } from '@/lib/queue-service';

const message = {
  type: 'order.created',
  orderId: 'ord_123',
  vendorId: 'vendor_456',
  customerId: 'cust_789',
  totalAmount: 5000,
  timestamp: new Date().toISOString(),
};

const messageId = await enqueueOrder(message);
console.log('Message queued:', messageId);
```

#### Process Queue Messages

```typescript
import { consumeOrders } from '@/lib/queue-service';

const handler = async (message) => {
  console.log('Processing order:', message.orderId);
  // Your business logic here
};

// Run worker
await consumeOrders(handler, 10); // Max 10 messages
```

#### Start Background Workers

```bash
# In separate terminal
npm run queue:workers
```

Worker processes:
- Order processor
- Product indexer
- Payment processor
- Notification sender

### Checking Queue Status

```bash
# List queue messages
docker exec mart-localstack awslocal sqs receive-message \
  --queue-url http://localhost:4566/000000000000/order-queue.fifo

# Get queue attributes
docker exec mart-localstack awslocal sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/order-queue.fifo \
  --attribute-names All

# Purge queue (delete all messages)
docker exec mart-localstack awslocal sqs purge-queue \
  --queue-url http://localhost:4566/000000000000/order-queue.fifo
```

## 5. Firebase Emulator

### Firestore Emulator

The Firebase emulator runs locally on port 9099 and provides:
- Local Firestore database
- Authentication emulation
- Cloud Storage emulation

**Data Location:** `.firebase/` (local development only)

### Connecting from App

```typescript
// In development, the app auto-connects to emulators
// Set in your .env.local:
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo  // Must match gcloud config
```

### Emulator UI

Access at: http://localhost:4000

Features:
- Browse collections
- View documents
- Edit data
- Export/import

### Using Firebase CLI

```bash
# Install
npm install -g firebase-tools

# Initialize
firebase init

# Start emulator
firebase emulators:start

# Import data
firebase emulators:start --import=./firebase-seed-data
```

## 6. Disaster Recovery

See [DISASTER-RECOVERY.md](./DISASTER-RECOVERY.md) for:
- RTO/RPO targets
- Backup procedures
- Recovery runbooks
- Incident escalation

### Quick Disaster Recovery Test

```bash
# Simulate complete data loss
docker compose down -v

# Restore from backup
docker compose up -d

# Verify recovery
curl http://localhost:3000/api/health
```

## 7. Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs [SERVICE_NAME]

# Rebuild container
docker compose build --no-cache [SERVICE_NAME]

# Full restart
docker compose down -v && docker compose up -d
```

### Metrics Not Showing

```bash
# Verify app is exporting metrics
curl http://localhost:3000/api/metrics | head -20

# Check Prometheus scrape jobs
curl http://localhost:9090/api/v1/targets

# Verify targets are healthy
# Grafana → Configuration → Data Sources → Prometheus → Test
```

### Queue Messages Not Processing

```bash
# Check queue depth
docker logs mart-app | grep "queue_depth"

# Inspect messages
docker exec mart-localstack awslocal sqs receive-message \
  --queue-url http://localhost:4566/000000000000/order-queue.fifo \
  --max-number-of-messages 10

# Check worker logs
npm run queue:workers
```

### High Memory Usage

```bash
# Check container memory
docker stats

# Reduce retention periods
# Prometheus: 1d (edit docker-compose.yml)
# Redis: Clear cache (redis-cli flushdb)

# Cleanup old test data
docker compose exec redis redis-cli FLUSHDB
```

## 8. Performance Tuning

### Prometheus

**Default Retention:** 7 days (edit docker-compose.yml)

```yaml
prometheus:
  command:
    - '--storage.tsdb.retention.time=7d'
    - '--query.max-samples=10000000'
```

### Grafana

**Dashboard Refresh:** Default 30s (edit dashboard)

**Data Source:** Adjust scrape interval in Prometheus config

### LocalStack

**Memory Limit:** Add to docker-compose.yml

```yaml
localstack:
  mem_limit: 2g  # 2GB max
```

## 9. Production Deployment

For production, replace:

| Local | Production |
|-------|-----------|
| Firebase Emulator | Cloud Firestore |
| LocalStack | AWS (S3, DynamoDB, SQS, SNS) |
| Redis (in Docker) | Cloud Memorystore Redis |
| Prometheus | Cloud Monitoring |
| Grafana (local) | Cloud Dashboards |

See [terraform/main.tf](../terraform/main.tf) for production configuration.

## 10. Useful Commands

```bash
# View all services
docker compose ps

# Follow logs for specific service
docker compose logs -f app

# Execute command in container
docker compose exec app npm run build

# Restart single service
docker compose restart app

# Scale service
docker compose up -d --scale app=3

# Remove everything including volumes
docker compose down -v

# View resource usage
docker stats

# Inspect network
docker network inspect mart-network

# Clean up unused images
docker image prune -a
```

## 11. Development Workflow

```bash
# 1. Start services
docker compose up -d

# 2. Develop your feature
# (App auto-reloads with hot reload)

# 3. Run load test
./scripts/run-load-test.sh 50 5m

# 4. Check metrics in Grafana
# http://localhost:3001

# 5. Run tests
npm test

# 6. Commit and push
git add .
git commit -m "Feature: ..."
git push
```

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Guide](https://grafana.com/docs/grafana/latest/dashboards/)
- [Firebase Emulator](https://firebase.google.com/docs/emulator-suite)
- [LocalStack Documentation](https://docs.localstack.cloud/)
- [Project CLAUDE.md](../CLAUDE.md)

## Support

For issues or questions:
- Check logs: `docker compose logs [service]`
- Review this guide
- Check GitHub issues
- Contact DevOps team
