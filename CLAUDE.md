# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ZilaCart** — a multi-vendor e-commerce marketplace targeting Kenya, built with Next.js 15 App Router, Firebase (Firestore + Auth + Storage), and Google Genkit AI. The app has three user roles: `customer`, `vendor`, and `admin`, each with distinct portals and permissions.

## Commands

```bash
# Development
npm run dev           # Start Next.js dev server on :3000
npm run dev:all       # Start Next.js + WebSocket server concurrently

# Build & type checking
npm run build
npm run typecheck     # tsc --noEmit
npm run lint          # next lint

# Genkit AI dev server
npm run genkit:dev    # Start Genkit dev UI
npm run genkit:watch  # Watch mode

# WebSocket server (standalone, runs on :3001)
npm run ws:start

# Database seeding
npm run db:seed
npm run seed:vendor-dashboard
npm run seed:vendor-data
npm run vendor:onboard-auto

# Dataset import
npm run import:csv
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill in:

```
# Firebase client-side (NEXT_PUBLIC_ prefix required for browser access)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (server-side only — required for all API routes)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=

# AI (optional — enables chatbot and recommendation flows)
GOOGLE_API_KEY=

# Payments
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

For local dev, `serviceAccountKey.json` in the project root is auto-loaded by `src/lib/firebase-admin.ts` as an alternative to the `FIREBASE_*` env vars. On Vercel, only env vars are used.

## Architecture

### Auth Flow

`AuthContext` (`src/context/AuthContext.tsx`) is the global auth provider. It:
- Uses Firebase client SDK (`src/lib/firebase-client.ts`) for sign-in/sign-up
- Stores `UserProfile` in Firestore `users/{uid}` and keeps it in React context
- Manages cart, wishlist, and applied promotions in context with debounced server sync
- Redirects new vendors to `/vendor/onboarding` if `storeName` is missing

All API routes use `withAuth()` from `src/lib/authMiddleware.ts`, which verifies Firebase ID tokens (passed as `Authorization: Bearer <token>`) and attaches `req.user` (Firebase `UserRecord`) and `req.userProfile` (Firestore `UserProfile`) to the request.

### Firebase Dual Initialization

- **Client**: `src/lib/firebase-client.ts` — exports `authClient`, `db` (Firestore), `analytics`
- **Admin**: `src/lib/firebase-admin.ts` — exports `firestoreAdmin`, `db` (alias), `storageAdmin`, `firebaseAdminAuth`. Loads `serviceAccountKey.json` if present, otherwise falls back to env vars.

### API Routes

All routes live under `src/app/api/`. Common patterns:

- Public endpoints: plain `GET` handlers
- Protected endpoints: wrapped with `withAuth(handler)` or `withAuth(handler, 'admin')` / `withAuth(handler, ['vendor', 'admin'])`
- Vendor-scoped routes live under `/api/vendors/me/` and `/api/vendor/me/`
- Payment routes: `/api/payment/stripe/intent/` (Stripe) and `/api/payment/paypal/` (PayPal)

### Role-Based Portals

| Role | Entry Point | Layout |
|------|------------|--------|
| Customer | `/account` | `src/app/account/layout.tsx` |
| Vendor | `/vendor` | `src/app/vendor/layout.tsx` |
| Admin | `/admin` | `src/app/admin/layout.tsx` |

`ConditionalShell` (`src/components/layout/ConditionalShell.tsx`) decides whether to render the public Header/Footer or hide them for dashboard routes.

### AI (Genkit)

Genkit is initialized in `src/ai/genkit.ts` using `googleAI` plugin with `GOOGLE_API_KEY`. AI flows live in `src/ai/flows/`:
- `ai-chatbot.ts` — customer support chatbot with Firestore tool calls (order status lookup, product search)
- `product-recommendations.ts` — personalized product recommendations
- `content-generation.ts` — AI-generated product descriptions
- `image-search.ts` — image-based product search

Flows are Server Actions (`'use server'`). The Genkit dev UI (`npm run genkit:dev`) is used to test flows in isolation.

### Real-Time (WebSocket)

A standalone WebSocket server (`src/server/websocket.ts`) runs on port 3001 and broadcasts analytics metrics and notifications to connected clients. Start it alongside Next.js with `npm run dev:all`. Client utilities are in `src/lib/websocket.ts`.

### Key Shared Modules

- `src/lib/types.ts` — all shared TypeScript types (User roles, Product, Order, Payout, Promotion, Ledger, etc.)
- `src/lib/stripe.ts` — lazy Stripe client initialization
- `src/lib/paypal.ts` — PayPal SDK wrapper
- `src/lib/algolia-search-service.ts` — Algolia search integration
- `src/lib/cache-service.ts` / `src/lib/services/caching-service.ts` — Redis-backed caching layer
- `src/lib/email.ts` — Nodemailer email sending

### Import Alias

All source imports use the `@/` alias mapping to `src/` (configured via Next.js default convention, no explicit `tsconfig.json` found in root — it uses `.tsbuildinfo`).

### MLOps Sidecar

`mlops/inference_service.py` is an independent FastAPI inference service. It has its own setup (`mlops/mlflow-setup.sh`) and runs separately from Next.js.

## Firestore Collections

Key collections inferred from the codebase:
- `users/{uid}` — UserProfile with `role`, `status`, `fullName`
- `products/{id}` — Product listings with `status: 'pending_approval' | 'active' | 'rejected' | 'draft'`
- `orders/{id}` — Orders with embedded `items[]`, `statusHistory[]`
- `refunds/{id}`, `payouts/{id}`, `promotions/{id}`
- `vendors/{uid}/settings` — VendorSettings subcollection
- `conversations/{id}`, `conversations/{id}/messages/{id}` — Messaging
- `ledger/{id}` — Financial ledger entries per vendor
- `users/{uid}/cart`, `users/{uid}/wishlist`, `users/{uid}/addresses` — Customer subcollections
