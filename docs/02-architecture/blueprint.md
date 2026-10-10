# ZilaCart Architecture Blueprint

**Product**: ZilaCart — multi-vendor e-commerce marketplace for Kenya.
**Stack**: Next.js 15 App Router + Firebase (Firestore / Auth / Storage) + Google Genkit AI.

---

## 1. High-Level Architecture

ZilaCart is a monorepo-style Next.js application backed by managed cloud services and a small set of standalone infrastructure components.

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| Frontend | Next.js 15 App Router (React Server Components + client components) | Storefront, dashboards, SSR/SSG rendering |
| API | Next.js Route Handlers (`src/app/api/**`) | REST endpoints, webhooks, Server Actions for AI flows |
| Database | Firebase Firestore | Primary NoSQL data store (users, products, orders, vendor orders, transactions) |
| Auth | Firebase Authentication | Sign-in/sign-up, ID token issuance/verification |
| Files | Firebase Storage | Product images, vendor documents, receipts |
| Cache / Rate limiting / Pub-Sub | Redis | Distributed cache, sliding-window rate limiting, realtime event fan-out |
| Async jobs | AWS SQS (via `@aws-sdk/client-sqs`) | Queue workers (product indexing, notifications) |
| Search | Algolia | Full-text product search, faceting, suggestions |
| AI | Google Genkit (flows in `src/ai/flows/`) | Chatbot, product recommendations, AI-assisted tooling |
| Realtime | Standalone WebSocket server (port 3001) | Live order/notification push via Redis pub/sub |
| Payments | Stripe, PayPal, M-Pesa (Safaricom Daraja) | Checkout and payouts |

### Runtime topology

```
                       ┌───────────────────────────────────────────────┐
                       │                  Client Browser                │
                       │  Storefront  ·  /account  ·  /vendor  ·  /admin│
                       └───────────────┬───────────────────────────────┘
                                       │ HTTPS (Firebase ID token)
                    ┌──────────────────▼───────────────────┐
                    │      Next.js 15 (App Router, :3000)   │
                    │  Route Handlers (src/app/api/**)      │
                    │  AI flows (Server Actions, 'use server')│
                    │  withAuth() / role-based gate          │
                    └──────┬─────────────┬───────────┬───────┘
                           │             │           │
               ┌───────────▼───┐   ┌─────▼─────┐   ┌▼──────────────────┐
               │ Firestore      │   │  Redis    │   │ Algolia (search)  │
               │ Admin SDK      │   │ cache/    │   └──────────────────┘
               │ (server-side)  │   │ rate/pub  │
               └───────────┬───┘   └───────────┘   ┌──────────────────┐
                           │                        │ AWS SQS          │
              ┌────────────▼─────────────┐          │ (queue workers)  │
              │ WebSocket server (:3001) │◄─────────┤                  │
              │ Redis subscriber → push  │          └──────────────────┘
              └──────────────────────────┘
```

---

## 2. Data Flow

1. **Client request** — the browser (or service worker) calls a Next.js Route Handler under `src/app/api/**`.
2. **Authentication** — protected routes wrap their handler with `withAuth()` from `src/lib/authMiddleware.ts`, which verifies the Firebase ID token from the `Authorization` header.
3. **Authorization** — `withAuth(handler, 'admin')` or `withAuth(handler, ['vendor', 'admin'])` enforces role-based access per route.
4. **Business logic** — handlers validate input (zod schemas in `src/lib/validation-schemas.ts`), then read/write Firestore **exclusively through the Admin SDK** (`src/lib/firebase-admin.ts`). The Admin SDK bypasses Firestore security rules; the client SDK (`src/lib/firebase-client.ts`) is used only for auth state, realtime listeners, and storage uploads. Never mix the two `db` instances.
5. **Async work** — fire-and-forget jobs (e.g., Algolia re-indexing) are enqueued to SQS and processed by workers (`src/lib/queue-service.ts`, `src/scripts/queue-workers.ts`).
6. **Realtime** — mutations publish events to a Redis channel (`src/lib/ws-events.ts`); the standalone WebSocket server subscribes and pushes to connected clients (`src/server/websocket.ts`).
7. **AI flows** — Genkit flows (`src/ai/flows/`) are Server Actions: invoked from client components, executed server-side with Genkit (`src/ai/genkit.ts`).

---

## 3. Roles

| Role | Portal | Capabilities |
|------|--------|--------------|
| `customer` | `/account` | Browse/search, manage cart & wishlist, checkout, track orders, refunds |
| `vendor` | `/vendor` | Catalog management, vendor-scoped orders (`/api/vendors/me/`), earnings, payouts |
| `admin` | `/admin` | User/vendor moderation, platform-wide orders, commission and platform settings |

Route guards combine Firestore role lookups with `withAuth()`; dashboards render inside `ConditionalShell`, which hides the storefront Header/Footer.

---

## 4. Payments

- **Stripe** — cards via PaymentIntents (`src/lib/stripe.ts`, `/api/payment/stripe/`), refunds via `POST /api/refunds`.
- **PayPal** — REST API v2 order creation/capture via a payment adapter (`/api/payment/paypal/order`, `/api/payment/paypal/capture`).
- **M-Pesa (Safaricom Daraja)** — STK push initiated at `/api/payment/mpesa`, callbacks received at `/api/webhooks/mpesa`, status polled via `/api/payment/mpesa/status`.
- Webhooks for Stripe/PayPal/M-Pesa are processed idempotently (see Design Decisions).

---

## 5. Key Design Decisions

1. **Server-side-only business data (Admin SDK)** — All reads/writes of business data happen server-side with the Firebase Admin SDK. Firestore security rules never handle money or inventory logic; the server is the single trusted writer.
2. **Cursor-based pagination** — List endpoints use `src/lib/pagination.ts`: Base64-encoded cursors (doc ID + sort value) with `startAfter`-style queries, returning `nextCursor`/`prevCursor` instead of offset paging. Stable under churn and cheap in Firestore.
3. **Transactional order creation** — Order creation runs in a single `firestoreAdmin.runTransaction(...)` (`src/app/api/orders/route.ts`): stock decrement, promo code usage, order + vendor-order writes are atomic.
4. **Vendor order split model** — A cart with items from multiple vendors is split into per-vendor `vendorOrders` at creation (`src/lib/vendor-order-split.ts`), so each vendor only sees and ships their own line items.
5. **10% platform commission** — `PLATFORM_COMMISSION_RATE = 0.10` (`src/lib/vendor-order-split.ts`). Vendor payouts are net of commission (`netAmount = totalAmount - commissionAmount`), recorded per sale in the financial ledger so refunds can claw back commission.
6. **Idempotent webhook processing** — Webhook handlers keyed on provider event IDs (`src/lib/webhook-idempotency.ts`) so Stripe/PayPal retries and M-Pesa callbacks cannot double-process a payment.
7. **Distributed cache with Redis + NodeCache fallback** — `src/lib/cache-service.ts` uses Redis (`GET/SETEX/DEL/INCR+EXPIRE`) with transparent fallback to an in-memory `node-cache` when Redis is unavailable; rate limiting (`src/lib/rate-limiter.ts`) follows the same pattern.

---

## 6. Infrastructure

| Concern | Solution | Location |
|---------|----------|----------|
| Local dev | Docker Compose: Next.js app, Firebase emulator, LocalStack (S3/DynamoDB/SQS), Redis, Prometheus, Grafana, WebSocket server | `docker-compose.yml` |
| Image builds | Docker multi-stage build (deps → build → runtime) with HEALTHCHECK on `/api/health` | `Dockerfile` |
| Kubernetes | Helm chart (`chart/nextn/`) with probes, HPA, ServiceMonitor, security contexts, ingress/TLS | `chart/nextn/` |
| IaC | Terraform (S3 remote state + DynamoDB locking) for EKS clusters and LocalStack targets; k3s profiles | `terraform/` |
| Observability | Prometheus (`/api/metrics`), ServiceMonitor/PodMonitor, PrometheusRules, Grafana dashboards + provisioning, Alertmanager | `k8s/` |
| Load testing | k6 scripts exercising realistic user workflows | `load-tests/k6-load-test.js` |

---

**Related docs**: `docs/03-deployment/PRODUCTION_DEPLOYMENT.md`, `docs/03-deployment/PRODUCTION_READINESS_CHECKLIST.md`.
