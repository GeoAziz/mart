# AGENTS.md

Compact reference for agents working in this repo. Every line exists because an agent would likely get it wrong without help.

## Project

ZilaCart — multi-vendor e-commerce marketplace for Kenya. Next.js 15 App Router + Firebase (Firestore/Auth/Storage) + Google Genkit AI. Three roles: `customer`, `vendor`, `admin`.

## Commands

```bash
npm run dev           # Next.js dev server on :3000
npm run dev:all       # Next.js + WebSocket server concurrently
npm run build         # Production build (typecheck + next build)
npm run typecheck     # tsc --noEmit
npm run lint          # next lint
npm run test          # Vitest (JS unit/integration tests)
npm run genkit:dev    # Genkit AI dev UI (test AI flows in isolation)
npm run ws:start      # WebSocket server standalone on :3001

# Python E2E tests (requires dev server running on :3000)
pip install -r tests/requirements.txt
pytest tests/test_master.py -m smoke -v
pytest tests/test_master.py -m e2e -v
pytest tests/test_master.py -m integration -v
```

**Verification order**: `npm run lint && npm run typecheck && npm run test`

## Architecture Gotchas

- **TypeScript is loose**: `strict: false` in tsconfig, and `next.config.ts` sets both `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`. Type errors won't block builds. Don't assume the compiler catches issues.
- **Dual Firebase init**: Client SDK in `src/lib/firebase-client.ts`, Admin SDK in `src/lib/firebase-admin.ts`. The admin SDK auto-loads `serviceAccountKey.json` from project root if present, otherwise uses env vars. These export different `db` instances — don't mix them.
- **WebSocket server is separate**: Runs on port 3001 via `npm run ws:start`. Not part of Next.js. Start both with `npm run dev:all`.
- **AI flows are Server Actions**: All Genkit flows in `src/ai/flows/` use `'use server'`. They're called from client components but run server-side.
- **Role-based portals**: `/account` (customer), `/vendor` (vendor), `/admin` (admin). `ConditionalShell` hides Header/Footer for dashboard routes.
- **Import alias**: `@/` maps to `src/`. Configured in tsconfig paths and vitest resolve.alias.
- **`browser` field in package.json**: Stubs out Node builtins (fs, path, crypto, etc.) for client bundles. This is intentional for packages like pdfkit, xlsx, handlebars.

## API Routes

All under `src/app/api/`. Protected routes use `withAuth()` from `src/lib/authMiddleware.ts` which verifies Firebase ID tokens. Role-gated: `withAuth(handler, 'admin')` or `withAuth(handler, ['vendor', 'admin'])`.

Vendor-scoped routes: `/api/vendors/me/` and `/api/vendor/me/`.

## Environment

- `.env` and `.env.local` are gitignored. Copy `.env.example` to `.env.local`.
- Client-side vars need `NEXT_PUBLIC_` prefix.
- `GOOGLE_API_KEY` is optional — enables chatbot and recommendation AI features.
- `serviceAccountKey.json` is gitignored but used by firebase-admin.ts for local dev.

## Testing

- **JS tests**: Vitest with jsdom, setup file at `vitest.setup.ts`. Run with `npm run test`.
- **Python E2E tests**: Pytest + Selenium in `tests/`. Requires dev server running. Tests are marked `smoke`, `e2e`, `integration`. Report artifacts go to `tests/reports/screenshots/`.
- **CI**: GitHub Actions runs E2E test matrix (smoke/e2e/integration) on push to main/develop and daily cron.

## Docker

`docker-compose.yml` spins up: Next.js app, Firebase emulator, LocalStack (S3/DynamoDB/SQS), Redis, Prometheus, Grafana, WebSocket server. Full local dev environment.

## Key Files

| File | Why it matters |
|------|---------------|
| `src/lib/types.ts` | All shared TypeScript types |
| `src/lib/authMiddleware.ts` | Auth gate for API routes |
| `src/context/AuthContext.tsx` | Global auth provider, cart/wishlist/promotions state |
| `src/components/layout/ConditionalShell.tsx` | Controls Header/Footer visibility per route |
| `src/ai/genkit.ts` | Genkit initialization |
| `src/lib/firebase-admin.ts` | Firebase Admin SDK (server-side) |
| `src/lib/firebase-client.ts` | Firebase Client SDK (browser) |
| `next.config.ts` | Webpack polyfills for Node builtins, image domains |
| `mlops/inference_service.py` | Standalone FastAPI ML inference service (separate from Next.js) |
