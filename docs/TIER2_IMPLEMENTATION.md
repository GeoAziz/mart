# TIER 2 HIGH Priority Implementation Guide

Complete implementation of payment integration hardening, vendor data isolation, and performance optimization for production launch.

## 1. Payment Integration Hardening

### 1.1 Webhook Verification

**Location**: `src/lib/webhook-verification.ts`

- **Stripe**: HMAC SHA-256 signature verification with timestamp validation
  - Prevents replay attacks by checking signature timestamp
  - Constant-time comparison prevents timing attacks
  - Verifies signature format (t=timestamp,v1=signature)

- **PayPal**: RSA SHA-256 signature verification
  - Verifies transmission ID, timestamp, webhook ID, and event ID
  - Checks certificate validity and chain
  - Protected against replay attacks

**Integration**:
```typescript
import { verifyStripeWebhookSignature, throwIfWebhookVerificationFails } from '@/lib/webhook-verification';

// Verify and throw if invalid
const isValid = await verifyStripeWebhookSignature(body, signature, secret);
throwIfWebhookVerificationFails(isValid, 'Stripe');
```

### 1.2 Webhook Idempotency

**Location**: `src/lib/webhook-idempotency.ts`

Ensures webhooks are processed exactly once, even with provider retries.

- Stores webhook event records in Firestore (`webhook_events` collection)
- Caches successful results for duplicate requests
- Prevents duplicate order confirmations, refunds, etc.

**Integration**:
```typescript
import { processWebhookOnce } from '@/lib/webhook-idempotency';

await processWebhookOnce('stripe', eventId, eventType, async () => {
  // Process webhook - only runs once
  await handlePaymentIntent(event);
  return { processed: true };
});
```

### 1.3 Order Status State Machine

**Location**: `src/lib/order-state-machine.ts`

Enforces valid order status transitions:

```
pending → [payment_pending, confirmed, cancelled]
payment_pending → [confirmed, cancelled, pending]
confirmed → [processing, cancelled]
processing → [shipped, cancelled]
shipped → [delivered, cancelled]
delivered → [refund_pending]
refund_pending → [refunded, delivered]
refunded → []
cancelled → []
```

**Integration**:
```typescript
import { validateStatusTransition } from '@/lib/order-state-machine';

// Throws error if transition invalid
validateStatusTransition(order.status, 'processing');
```

### 1.4 Updated Webhook Routes

- **Stripe**: `src/app/api/webhooks/stripe/route.ts`
  - Handles: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
  - Verifies signature, checks idempotency, validates status transitions

- **PayPal**: `src/app/api/webhooks/paypal/route.ts`
  - Updated to use new verification and idempotency utilities
  - Refactored for clarity and security

## 2. Vendor Data Isolation

### 2.1 Isolation Middleware

**Location**: `src/lib/vendor-isolation.ts`

Provides utility functions to enforce vendor data access control:

```typescript
// Verify vendor owns product
verifyVendorOwnsProduct(vendorId, product.vendorId);

// Verify vendor can access order
verifyVendorCanAccessOrder(vendorId, order.vendorIds);

// Verify user owns resource
verifyUserOwnsResource(userId, resource.userId);

// Filter items by vendor
const vendorItems = filterByVendor(items, vendorId);

// Get vendor ID with validation
const vendorId = getVendorIdFromUser(userProfile);
```

### 2.2 Firestore Security Rules

**Location**: `firestore.rules`

Comprehensive security rules enforced at database level:

**Users Collection**:
- Users can read/update own profile
- Admins can read all profiles

**Products Collection**:
- Public read for active products
- Vendors can create/update/delete own products
- Admins can manage all products

**Orders Collection**:
- Customers see own orders
- Vendors see orders containing their products
- Admins see all orders

**Sensitive Collections** (refunds, payouts, ledger):
- Vendors: read own
- Customers: limited access
- Admins: full access

**Deploy Rules**:
```bash
firebase deploy --only firestore:rules
```

### 2.3 Vendor Products API

**Location**: `src/app/api/vendor/me/products/route.ts`

- GET: List vendor's products with pagination
  - Uses vendor isolation checks
  - Caches results
  - Supports filtering by status

- POST: Create new product
  - Validates vendor ownership
  - Defaults to draft status
  - Requires admin approval

## 3. Performance Optimization

### 3.1 Firestore Composite Indexes

**Location**: `firestore-indexes.json`

Create indexes for common query patterns:

Key indexes:
- Customer orders by creation date
- Vendor orders by creation date
- Orders by status and date
- Vendor products by status and date
- Products by category, status, and rating
- Vendor ledger entries
- Refund and payout queries

**Deploy Indexes**:
```bash
firebase deploy --only firestore:indexes
```

### 3.2 Cursor-based Pagination

**Location**: `src/lib/pagination.ts`

Efficient pagination without OFFSET (which is slow on large collections):

```typescript
import { paginateQuery } from '@/lib/pagination';

const result = await paginateQuery(
  'products',
  constraints,
  'createdAt',
  'desc',
  { pageSize: 20, cursor: nextCursor }
);

// Returns: { items, nextCursor, prevCursor, hasMore }
```

Benefits:
- O(1) performance regardless of page number
- Handles cursor invalidation gracefully
- Works with distributed indexes

### 3.3 Multi-layer Caching Strategy

**Location**: `src/lib/cache-strategy.ts`

Caching for products, categories, and vendor profiles:

**Cache Layers**:
1. **In-Memory (NodeCache)**: 10-minute default TTL
2. **Application Level**: Category/vendor-specific caches
3. **Browser Level**: HTTP caching headers

**Cache Keys**:
- `products:all:PAGE_KEY` - Product pages
- `products:vendor:VENDOR_ID` - Vendor's products
- `products:category:CATEGORY` - Category products
- `product:detail:PRODUCT_ID` - Single product
- `categories:all` - All categories
- `vendor:profile:VENDOR_ID` - Vendor profile

**Cache Invalidation**:
```typescript
import { invalidateProductCaches, invalidateCategoriesList } from '@/lib/cache-strategy';

// When product updated
await invalidateProductCaches(productId, vendorId);

// When category changed
await invalidateCategoryCaches(categoryName);

// Warm cache on startup
await warmProductCache();
```

**TTLs**:
- Product catalog: 1 hour
- Product details: 30 minutes
- Categories: 2 hours
- Vendor profile: 1 hour

## 4. Security Best Practices

### 4.1 API Security

✅ **Implemented**:
- Input validation with Zod schemas
- Webhook signature verification
- Idempotency for payment operations
- Role-based access control
- Vendor data isolation
- Status transition validation
- Constant-time comparison for secrets

### 4.2 Database Security

✅ **Implemented**:
- Firestore security rules
- Collection-level access control
- Field-level visibility rules
- Transaction atomicity for critical operations

### 4.3 Production Checklist

Before deployment:
- [ ] Stripe webhook secret configured in environment
- [ ] PayPal webhook ID configured in environment
- [ ] Firestore rules deployed
- [ ] Composite indexes created
- [ ] CORS properly configured
- [ ] Rate limiting in place (CloudflareEdge)
- [ ] Logging and monitoring configured
- [ ] Error tracking (Sentry) configured
- [ ] All vendor isolation tests passing

## 5. Testing Recommendations

### 5.1 Webhook Testing

```bash
# Test Stripe webhook locally
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "stripe-signature: YOUR_TEST_SIGNATURE" \
  -d @webhook-payload.json
```

### 5.2 Vendor Isolation Testing

- Test vendor can view own products
- Test vendor cannot view other vendor's products
- Test vendor cannot access other vendor's orders
- Test admin can access all data

### 5.3 Performance Testing

- Test pagination with 1M+ documents
- Verify cache hit rates
- Monitor index performance with CloudSQL Insights

## 6. Monitoring & Observability

Key metrics to monitor:
- Webhook processing latency
- Webhook idempotency hit rate
- Cache hit/miss ratio
- Query performance with new indexes
- Vendor access control violations
- Status transition failures

## 7. Future Enhancements

- [ ] Advanced analytics on vendor performance
- [ ] Machine learning for fraud detection
- [ ] Real-time notifications using WebSockets
- [ ] GraphQL API for complex queries
- [ ] Event-driven architecture with Pub/Sub
