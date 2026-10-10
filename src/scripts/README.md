# ZilaCart Database Scripts

This directory contains various utility scripts for seeding, importing, and managing the ZilaCart Firestore database.

Since this project uses Next.js and Firebase Admin, these scripts are executed using `tsx` (TypeScript Execute) to handle imports and environment variables properly.

## Recommended Workflows

### 1. Import the Realistic Catalog (Recommended)
Populates the database with realistic products, categories, users (with avatars), and order histories.
```bash
npm run import:real-catalog
```
*Behind the scenes: Runs `src/scripts/import_dataset.ts` targeting the `synthetic-ecommerce-dataset/real_catalog` directory.*

### 2. Generate Synthetic Data
If you prefer randomized dummy data (generated via Faker.js) rather than the CSV dataset:
```bash
npm run db:seed
```
*Behind the scenes: Runs `src/scripts/seed.ts`.*

---

## Targeted Seeding & Vendor Management

- **`npm run seed:vendor-dashboard`** (`seed-vendor-dashboard.ts`)  
  Injects dummy metrics, sales history, and performance data specifically for testing the Vendor Analytics Dashboard.

- **`npm run seed:vendor-data`** (`seed-vendor-data.ts`)  
  Populates targeted vendor store profiles and inventory.

- **`npm run backfill:vendor-orders`** (`backfill-vendor-orders.ts`)  
  Backfills historical orders for existing vendors, useful for testing time-series analytics and payout logic.

- **`npm run vendor:onboard-auto`** (`complete-vendor-onboarding.ts`)  
  Automatically completes the multi-step vendor onboarding process for a test user.

---

## Utilities & Catalog Management

- **`catalog:fetch`** (`fetch-real-catalog.ts`)  
  Scrapes/downloads product catalog updates and saves them into the `synthetic-ecommerce-dataset/real_catalog` folder.

- **`audit_firestore.ts`**  
  A handy script to test your Firebase Admin connection and print out a sample of documents from the core collections to verify data integrity. Run via: `npx tsx src/scripts/audit_firestore.ts`

- **`count_firestore.ts`**  
  Quickly counts the total number of documents across all major collections.

- **`create-admin-user.ts`**  
  Elevates a specific user to have the `admin` role in Firestore and Custom Claims.

- **`index-products-algolia.ts`**  
  Syncs the Firestore product catalog with Algolia for the frontend search experience.

- **`diagnose.ts`**  
  Runs a suite of health checks against the database schema and configurations.

---

## Background Workers (Local Dev)
When running locally without Vercel Cron/Cloud Tasks, you can spin up the background queue workers:
- `npm run queue:orders`
- `npm run queue:products`
- `npm run queue:payments`
- `npm run queue:notifications`
- `npm run worker:reservation-expiry`

