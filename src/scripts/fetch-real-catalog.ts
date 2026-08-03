/**
 * fetch-real-catalog.ts
 *
 * Builds a REAL, image-matched product catalog by pulling from curated public
 * product APIs (DummyJSON + Fake Store) instead of inventing names and guessing
 * photos. Because those sources are real catalogs, each product's image, title,
 * brand, category, description, sku and price already describe the SAME product —
 * so the image always matches the product (the fix for the "image doesn't match"
 * bug caused by the old placeholder-less synthetic data).
 *
 * Outputs a clean, rich `products.csv` (+ referentially-consistent companion CSVs)
 * into `synthetic-ecommerce-dataset/real_catalog/`, and can optionally download the
 * images into Firebase Storage and/or seed Firestore directly.
 *
 * Usage:
 *   npx tsx src/scripts/fetch-real-catalog.ts [flags]
 *     --no-download   keep source CDN image URLs (fast; default is to download to Storage)
 *     --seed          write products straight into Firestore `products/{id}`
 *     --no-fakestore  DummyJSON only
 *     --limit=N       cap number of products (for quick tests)
 */

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const hasFlag = (f: string) => args.includes(f);
const DOWNLOAD_IMAGES = !hasFlag('--no-download');
const SEED_FIRESTORE = hasFlag('--seed');
const INCLUDE_FAKESTORE = !hasFlag('--no-fakestore');
const LIMIT = (() => {
  const a = args.find((x) => x.startsWith('--limit='));
  return a ? parseInt(a.split('=')[1], 10) : Infinity;
})();

const OUT_DIR = path.join(process.cwd(), 'synthetic-ecommerce-dataset', 'real_catalog');

// Vendors: round-robin over the same IDs seed.ts creates (vendor_user_id_1..4)
const VENDOR_IDS = ['vendor_user_id_1', 'vendor_user_id_2', 'vendor_user_id_3', 'vendor_user_id_4'];

// ---------------------------------------------------------------------------
// Category mapping: source (fine) category -> app top-level category
// App categories come from src/scripts/seed.ts `categoriesData`.
// ---------------------------------------------------------------------------
const CATEGORY_MAP: Record<string, string> = {
  // Electronics
  smartphones: 'Electronics',
  laptops: 'Electronics',
  tablets: 'Electronics',
  'mobile-accessories': 'Electronics',
  electronics: 'Electronics',
  // Fashion
  'mens-shirts': 'Fashion',
  'mens-shoes': 'Fashion',
  'mens-watches': 'Fashion',
  tops: 'Fashion',
  'womens-bags': 'Fashion',
  'womens-dresses': 'Fashion',
  'womens-jewellery': 'Fashion',
  'womens-shoes': 'Fashion',
  'womens-watches': 'Fashion',
  sunglasses: 'Fashion',
  jewelery: 'Fashion',
  "men's clothing": 'Fashion',
  "women's clothing": 'Fashion',
  // Groceries
  groceries: 'Groceries',
  // Home & Kitchen
  furniture: 'Home & Kitchen',
  'home-decoration': 'Home & Kitchen',
  'kitchen-accessories': 'Home & Kitchen',
  // Health & Beauty
  beauty: 'Health & Beauty',
  fragrances: 'Health & Beauty',
  'skin-care': 'Health & Beauty',
  // Automotive
  motorcycle: 'Automotive',
  vehicle: 'Automotive',
  // Sports & Outdoors
  'sports-accessories': 'Sports & Outdoors',
};

function mapCategory(raw: string): string {
  const key = (raw || '').toLowerCase().trim();
  return CATEGORY_MAP[key] || 'Home & Kitchen'; // safe generic fallback
}

// ---------------------------------------------------------------------------
// Canonical product shape we emit
// ---------------------------------------------------------------------------
interface CatalogProduct {
  product_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock_quantity: number;
  rating: number;
  brand: string;
  sku: string;
  status: string;
  dataAiHint: string;
  vendorId: string;
  imageUrl: string;
  additionalImageUrls: string[]; // serialized pipe-delimited in CSV
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
// Public catalog APIs are flaky; retry with backoff and a hard per-attempt timeout
// so a stalled socket can't hang the whole build.
async function fetchJson(url: string, attempts = 3): Promise<any> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      const reason = (err as any)?.cause?.code || (err as Error).message;
      if (i < attempts) {
        console.warn(`  retry ${i}/${attempts - 1} for ${url} (${reason})`);
        await new Promise((r) => setTimeout(r, 1000 * i));
      }
    }
  }
  throw lastErr;
}

function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item';
}

async function fetchDummyJson(): Promise<CatalogProduct[]> {
  console.log('Fetching DummyJSON catalog...');
  const data = await fetchJson('https://dummyjson.com/products?limit=0');
  const items: any[] = data.products || [];
  return items.map((p, i) => {
    const category = mapCategory(p.category);
    const brand = (p.brand && String(p.brand).trim()) || String(p.title).split(' ')[0];
    return {
      product_id: `dj_${p.id}`,
      name: String(p.title).trim(),
      description: String(p.description || '').trim(),
      price: Number(p.price) || 0,
      category,
      stock_quantity: Number.isFinite(p.stock) ? Number(p.stock) : 50,
      rating: Number(p.rating) || 0,
      brand,
      sku: p.sku || `${category.substring(0, 3).toUpperCase()}-${1000 + i}`,
      status: 'active',
      dataAiHint: category.toLowerCase(),
      vendorId: VENDOR_IDS[i % VENDOR_IDS.length],
      imageUrl: p.thumbnail || (Array.isArray(p.images) ? p.images[0] : '') || '',
      additionalImageUrls: Array.isArray(p.images) ? p.images.slice(0, 5) : [],
    };
  });
}

async function fetchFakeStore(offset: number): Promise<CatalogProduct[]> {
  console.log('Fetching Fake Store catalog...');
  const items: any[] = await fetchJson('https://fakestoreapi.com/products');
  return items.map((p, i) => {
    const category = mapCategory(p.category);
    const brand = String(p.title).split(' ')[0];
    return {
      product_id: `fs_${p.id}`,
      name: String(p.title).trim(),
      description: String(p.description || '').trim(),
      price: Number(p.price) || 0,
      category,
      stock_quantity: 20 + Math.floor(Math.random() * 480),
      rating: p.rating && typeof p.rating.rate === 'number' ? p.rating.rate : 4,
      brand,
      sku: `${category.substring(0, 3).toUpperCase()}-${offset + i}`,
      status: 'active',
      dataAiHint: category.toLowerCase(),
      vendorId: VENDOR_IDS[(offset + i) % VENDOR_IDS.length],
      imageUrl: p.image || '',
      additionalImageUrls: p.image ? [p.image] : [],
    };
  });
}

// ---------------------------------------------------------------------------
// Image download -> Firebase Storage (optional)
// ---------------------------------------------------------------------------
async function downloadImagesToStorage(products: CatalogProduct[]): Promise<void> {
  const { storageAdmin } = await import('@/lib/firebase-admin');
  const bucket = storageAdmin.bucket();
  console.log(`Downloading images into Storage bucket ${bucket.name} ...`);

  let done = 0;
  for (const p of products) {
    const urls = [p.imageUrl, ...p.additionalImageUrls].filter(Boolean);
    const rewritten: string[] = [];
    for (let idx = 0; idx < urls.length; idx++) {
      const srcUrl = urls[idx];
      try {
        const res = await fetch(srcUrl);
        if (!res.ok) throw new Error(`${res.status}`);
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const ext = (contentType.split('/')[1] || 'jpg').split(';')[0];
        const buf = Buffer.from(await res.arrayBuffer());
        const filePath = `products/synthetic/${p.product_id}/${slugify(p.name)}-${idx}.${ext}`;
        const file = bucket.file(filePath);
        await file.save(buf, { metadata: { contentType }, public: true });
        rewritten.push(`https://storage.googleapis.com/${bucket.name}/${filePath}`);
      } catch (err) {
        console.warn(`  ! image failed (${p.product_id}, ${srcUrl}): ${(err as Error).message} — keeping source URL`);
        rewritten.push(srcUrl);
      }
    }
    if (rewritten.length) {
      p.imageUrl = rewritten[0];
      p.additionalImageUrls = rewritten.slice(1);
    }
    if (++done % 25 === 0) console.log(`  ...${done}/${products.length}`);
  }
  console.log('Image download complete.');
}

// ---------------------------------------------------------------------------
// CSV writing (RFC-4180 escaping)
// ---------------------------------------------------------------------------
function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function writeCsv(file: string, header: string[], rows: unknown[][]): void {
  const lines = [header.join(',')];
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
  console.log(`  wrote ${path.basename(file)} (${rows.length} rows)`);
}

// ---------------------------------------------------------------------------
// Referentially-consistent companion data (users / orders / order_items / reviews)
// Only references product IDs that exist in `products`.
// ---------------------------------------------------------------------------
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCompanions(products: CatalogProduct[]) {
  const NUM_USERS = 200;
  const NUM_ORDERS = 500;
  const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  const users = Array.from({ length: NUM_USERS }, (_, i) => {
    const id = i + 1;
    return [
      id,
      `Customer ${id}`,
      `customer${id}@example.com`,
      `+254${700000000 + id}`,
      `${id} Market Street, Nairobi`,
      '2024-06-01',
      pick(['Bronze', 'Silver', 'Gold']),
      Math.floor(Math.random() * 2000),
    ];
  });

  const orders: unknown[][] = [];
  const orderItems: unknown[][] = [];
  for (let oid = 1; oid <= NUM_ORDERS; oid++) {
    const userId = 1 + Math.floor(Math.random() * NUM_USERS);
    const nItems = 1 + Math.floor(Math.random() * 3);
    let total = 0;
    const usedProducts = new Set<string>();
    for (let k = 0; k < nItems; k++) {
      const prod = pick(products);
      if (usedProducts.has(prod.product_id)) continue;
      usedProducts.add(prod.product_id);
      const qty = 1 + Math.floor(Math.random() * 3);
      total += prod.price * qty;
      orderItems.push([oid, prod.product_id, qty]);
    }
    orders.push([oid, userId, '2025-01-15', pick(ORDER_STATUSES), total.toFixed(2)]);
  }

  const reviews: unknown[][] = [];
  let rid = 1;
  for (const prod of products) {
    const n = Math.floor(Math.random() * 3); // 0-2 reviews each
    for (let k = 0; k < n; k++) {
      reviews.push([
        rid++,
        1 + Math.floor(Math.random() * NUM_USERS),
        prod.product_id,
        (3 + Math.random() * 2).toFixed(1),
        'Solid product, matches the description and photos.',
        '2025-03-10',
      ]);
    }
  }

  return { users, orders, orderItems, reviews };
}

// ---------------------------------------------------------------------------
// Firestore seeding (optional)
// ---------------------------------------------------------------------------
async function seedFirestore(products: CatalogProduct[]): Promise<void> {
  const { firestoreAdmin } = await import('@/lib/firebase-admin');
  const { Timestamp } = await import('firebase-admin/firestore');
  console.log('Seeding Firestore products/{id} ...');
  const now = Timestamp.now();
  const BATCH = 200;
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = firestoreAdmin.batch();
    for (const p of products.slice(i, i + BATCH)) {
      const ref = firestoreAdmin.collection('products').doc(p.product_id);
      batch.set(
        ref,
        {
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          stock: p.stock_quantity,
          imageUrl: p.imageUrl,
          additionalImageUrls: p.additionalImageUrls,
          brand: p.brand,
          sku: p.sku,
          status: p.status,
          dataAiHint: p.dataAiHint,
          vendorId: p.vendorId,
          rating: p.rating,
          dateAdded: now,
          updatedAt: now,
          imported: true,
        },
        { merge: true }
      );
    }
    await batch.commit();
  }
  console.log('Firestore seed complete.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Real catalog builder ===');
  console.log({ DOWNLOAD_IMAGES, SEED_FIRESTORE, INCLUDE_FAKESTORE, LIMIT });

  let products = await fetchDummyJson();
  if (INCLUDE_FAKESTORE) {
    // Fake Store is a supplementary source. If it's unreachable we still have a
    // complete, image-matched catalog from DummyJSON, so don't fail the build.
    try {
      const extra = await fetchFakeStore(products.length);
      products = products.concat(extra);
    } catch (err) {
      console.warn(`Fake Store unavailable (${(err as any)?.cause?.code || (err as Error).message}); continuing with DummyJSON only.`);
    }
  }
  if (Number.isFinite(LIMIT)) products = products.slice(0, LIMIT);
  console.log(`Total products assembled: ${products.length}`);

  // Sanity: every product must have a name + image + category
  const bad = products.filter((p) => !p.name || !p.imageUrl || !p.category);
  if (bad.length) console.warn(`WARNING: ${bad.length} products missing name/image/category`);

  if (DOWNLOAD_IMAGES) {
    await downloadImagesToStorage(products);
  }

  // Write CSVs
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Writing dataset to ${OUT_DIR}`);
  writeCsv(
    path.join(OUT_DIR, 'products.csv'),
    [
      'product_id', 'name', 'description', 'category', 'price', 'stock_quantity',
      'rating', 'brand', 'sku', 'status', 'dataAiHint', 'vendorId',
      'imageUrl', 'additionalImageUrls',
    ],
    products.map((p) => [
      p.product_id, p.name, p.description, p.category, p.price, p.stock_quantity,
      p.rating, p.brand, p.sku, p.status, p.dataAiHint, p.vendorId,
      p.imageUrl, p.additionalImageUrls.join('|'),
    ])
  );

  const { users, orders, orderItems, reviews } = generateCompanions(products);
  writeCsv(path.join(OUT_DIR, 'users.csv'),
    ['user_id', 'name', 'email', 'phone', 'address', 'signup_date', 'membership_status', 'loyalty_points'], users);
  writeCsv(path.join(OUT_DIR, 'orders.csv'),
    ['order_id', 'user_id', 'order_date', 'status', 'total_amount'], orders);
  writeCsv(path.join(OUT_DIR, 'order_items.csv'),
    ['order_id', 'product_id', 'quantity'], orderItems);
  writeCsv(path.join(OUT_DIR, 'reviews.csv'),
    ['review_id', 'user_id', 'product_id', 'rating', 'review_text', 'review_date'], reviews);

  if (SEED_FIRESTORE) {
    await seedFirestore(products);
  }

  console.log('=== Done ===');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Catalog build failed:', err);
    process.exit(1);
  });
