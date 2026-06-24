# E2E User Stories and Journey Map

This document translates the current ZilaCart product surface into prioritized user stories that can drive complete end-to-end (E2E) test coverage.

## Why this exists

The repository has broad feature coverage (customer storefront, checkout/payments, vendor operations, admin controls, messaging, refunds/payouts, analytics), but E2E automation is currently organized more by technical phases than by explicit business stories. This guide provides:

- story-based scope for full journey testing,
- clear acceptance criteria to implement automation against,
- traceability from user intent to test suites.

---

## Product Areas Discovered in Repo (Deep-Dive Summary)

### Frontend journey surfaces

- Public commerce: homepage, categories, products, PDP, cart, checkout, track order.
- Auth + account: login/register, profile, orders, wishlist, addresses, notifications.
- Vendor portal: onboarding, inventory, orders, analytics, reports, earnings, shipping, messaging, reviews.
- Admin portal: overview, orders, users, products, categories, reviews, refunds, payouts, CMS, promotions, site health.

### API journey surfaces

- Commerce APIs: `/api/products`, `/api/cart`, `/api/orders`, `/api/reviews`, `/api/categories`.
- Payment APIs: Stripe intents + PayPal create/capture + webhooks/reconciliation.
- Vendor APIs: product management, inventory, reporting/analytics, payouts, integrations/settings.
- Admin/business APIs: promotions, payouts, refunds, CMS content.

### Existing E2E assets

- Pytest/Selenium framework with Page Objects and suite-level tests (`checkout`, `product_details`, `paypal`).
- Multi-role full-journey documentation describing customer/vendor/admin phased execution.
- Support utilities for logging, screenshots, browser setup, API calls, waits.

---

## Personas

1. **Shopper (Customer)**: discovers products, manages cart, checks out, tracks orders, manages account.
2. **Seller (Vendor)**: onboards, lists products, manages inventory, fulfills orders, tracks earnings.
3. **Operations (Admin)**: governs catalog/users/orders, resolves refunds/payouts, manages site content.
4. **System Integrations**: payment providers and backend persistence/notifications that ensure reliable outcomes.

---

## Story Prioritization Model

- **P0 (Revenue-Critical)**: must pass before release.
- **P1 (Operational-Critical)**: must pass for production stability.
- **P2 (Experience-Critical)**: should pass for quality confidence.

---

## User Stories for Complete E2E Coverage

## A) Customer Stories

### US-CUST-001 (P0): Discover and evaluate products
**As a shopper, I want to browse catalog and open a product page so I can decide what to buy.**

**Acceptance criteria**
- Given the homepage, user can navigate to products and categories.
- Product listing loads with at least one visible item card.
- Opening PDP shows core product details (name, price, CTA).
- Back navigation returns to listing without hard failure.

**E2E assertions**
- 200 responses for page + product API calls.
- No uncaught JS errors during listing/PDP load.

---

### US-CUST-002 (P0): Add items to cart and review cart state
**As a shopper, I want to add an item to my cart and review totals so I can prepare checkout.**

**Acceptance criteria**
- Add to cart from PDP succeeds with visible confirmation.
- Cart page shows the selected item and quantity controls.
- Subtotal updates after quantity change.
- Cart persists after refresh (session/account scope).

**E2E assertions**
- Cart API reflects expected line items.
- UI subtotal equals computed line totals.

---

### US-CUST-003 (P0): Checkout and pay successfully
**As a shopper, I want to submit checkout details and complete payment so my order is placed.**

**Acceptance criteria**
- Checkout form accepts valid shipping/contact fields.
- User can choose supported payment route (PayPal/Stripe as configured).
- Successful payment leads to order confirmation state.
- An order record exists with expected status and amount.

**E2E assertions**
- Payment create/capture (or intent confirm) returns success.
- Order API contains created order tied to customer.

---

### US-CUST-004 (P1): Track and manage my orders
**As a shopper, I want to view order history and order details so I can track fulfillment.**

**Acceptance criteria**
- Account orders page lists most recent order.
- Opening order details renders status timeline/info.
- Track-order entry point finds order with valid identifiers.

---

### US-CUST-005 (P2): Manage wishlist and addresses
**As a shopper, I want to save products and manage addresses so future checkout is faster.**

**Acceptance criteria**
- Add/remove wishlist updates both UI and backend.
- Address CRUD succeeds from account addresses page.
- Saved address is selectable during checkout.

---

## B) Vendor Stories

### US-VEND-001 (P0): Complete onboarding and access dashboard
**As a vendor, I want to complete onboarding so I can start selling.**

**Acceptance criteria**
- Vendor login works and role-based access is enforced.
- Onboarding flow can be completed (or already-complete state handled).
- Dashboard metrics/widgets render without blocking errors.

---

### US-VEND-002 (P0): Create and manage product listings
**As a vendor, I want to add/edit products so my catalog stays current.**

**Acceptance criteria**
- Add product flow validates required fields and persists product.
- Manage products list displays newly added item.
- Edit product updates are reflected in listing/PDP.

---

### US-VEND-003 (P0): Update inventory and fulfill orders
**As a vendor, I want to manage stock and process incoming orders so I can fulfill demand accurately.**

**Acceptance criteria**
- Inventory adjustments persist and display current stock.
- Incoming order appears for vendor after customer purchase.
- Vendor can update order status through expected progression.

---

### US-VEND-004 (P1): Monitor earnings and reports
**As a vendor, I want to review earnings and reports so I can run my business.**

**Acceptance criteria**
- Earnings/transactions pages load with non-empty or empty-state-safe UI.
- Reports and analytics pages render key charts/tables.
- Date filtering/preset selection updates displayed data.

---

### US-VEND-005 (P2): Configure shipping, support, and messaging
**As a vendor, I want to manage shipping/support/messaging so I can serve buyers efficiently.**

**Acceptance criteria**
- Shipping settings save successfully.
- Support center and messaging pages load and allow basic interactions.
- Notifications mark-read/read-all endpoints behave correctly.

---

## C) Admin Stories

### US-ADM-001 (P0): Access admin operations hub
**As an admin, I want secure access to admin dashboards so I can supervise platform health.**

**Acceptance criteria**
- Admin login succeeds and non-admin access is blocked.
- Admin overview loads key KPIs or safe empty states.
- Site health page is reachable and reports core checks.

---

### US-ADM-002 (P0): Moderate catalog and reviews
**As an admin, I want to manage products/categories/reviews so marketplace quality stays high.**

**Acceptance criteria**
- Category and product management pages render actionable controls.
- Review moderation actions persist correctly.
- Changes are reflected on corresponding customer-facing surfaces.

---

### US-ADM-003 (P1): Resolve orders, refunds, and payouts
**As an admin, I want to process financial operations so buyer/seller trust is maintained.**

**Acceptance criteria**
- Admin can open order details and inspect lifecycle state.
- Refund requests can be listed and processed via admin workflow.
- Payout records/status pages load and allow expected actions.

---

### US-ADM-004 (P2): Manage promotions and CMS content
**As an admin, I want to control promotions and homepage content so campaigns can be launched safely.**

**Acceptance criteria**
- Promotions CRUD/apply path works for valid promotions.
- CMS home/content pages save updates successfully.
- Updated content is reflected on relevant public pages.

---

## D) Cross-Cutting Reliability Stories

### US-SYS-001 (P0): Payment reliability and idempotency
**As the platform, I want payment/order operations to be idempotent so retries don’t duplicate financial outcomes.**

**Acceptance criteria**
- Duplicate checkout submission does not create duplicate orders.
- PayPal capture retries are safely handled.
- Stripe intent state transitions remain consistent.

---

### US-SYS-002 (P1): Authorization boundaries
**As the platform, I want role-scoped API access so users only perform permitted actions.**

**Acceptance criteria**
- Customer cannot access vendor/admin endpoints.
- Vendor cannot access admin-only operations.
- Protected routes return correct unauthorized/forbidden responses.

---

### US-SYS-003 (P1): Core observability during E2E
**As the QA team, I want logs/screenshots/report artifacts so failures are diagnosable fast.**

**Acceptance criteria**
- Each major journey captures screenshot checkpoints.
- Structured logs and test summary JSON are emitted.
- Failures include page URL and primary selector context.

---

## Suggested E2E Execution Plan (Story-First)

1. **Release Gate (P0 smoke)**
   - US-CUST-001/002/003
   - US-VEND-001/002/003
   - US-ADM-001/002
   - US-SYS-001

2. **Operational Regression (P1)**
   - US-CUST-004
   - US-VEND-004
   - US-ADM-003
   - US-SYS-002/003

3. **Experience Regression (P2)**
   - US-CUST-005
   - US-VEND-005
   - US-ADM-004

---

## Traceability Template (to keep in PRs)

Use this template whenever adding/changing E2E tests:

| Story ID | Scenario Name | Test File | Priority | Status |
|---|---|---|---|---|
| US-CUST-003 | Customer checkout happy path | `tests/...` | P0 | ✅/❌ |

This keeps coverage tied to user value rather than only technical routes.

---

## Immediate Next Actions

1. Create/rename canonical test files by story groups (`customer`, `vendor`, `admin`, `system`).
2. Add story IDs in pytest test names and logging output.
3. Define a CI pipeline stage that must pass all P0 stories to merge.
4. Add data-fixture strategy per story (seeded products/users/orders).

