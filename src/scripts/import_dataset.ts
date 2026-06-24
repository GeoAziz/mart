import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const BATCH_SIZE = 200; // safe for Spark plan

function readCSV(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return parse(raw, { columns: true, skip_empty_lines: true });
}

async function commitBatch(batch: FirebaseFirestore.WriteBatch) {
  await batch.commit();
}

async function writeInBatches(records: any[], makeRefAndSet: (batch: FirebaseFirestore.WriteBatch, r: any) => void) {
  let batch = firestoreAdmin.batch();
  let ops = 0;
  for (const r of records) {
    makeRefAndSet(batch, r);
    ops++;
    if (ops >= BATCH_SIZE) {
      await commitBatch(batch);
      batch = firestoreAdmin.batch();
      ops = 0;
    }
  }
  if (ops > 0) await commitBatch(batch);
}

function toTimestamp(dateLike: string) {
  if (!dateLike) return Timestamp.fromDate(new Date());
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return Timestamp.fromDate(new Date());
  return Timestamp.fromDate(d);
}

async function ensureCategoryDocs(categories: Set<string>) {
  const batch = firestoreAdmin.batch();
  for (const cat of categories) {
    const id = cat.toLowerCase().replace(/\s+/g, '-');
    const ref = firestoreAdmin.collection('categories').doc(id);
    batch.set(ref, { name: cat, slug: id, createdAt: Timestamp.now() }, { merge: true });
  }
  await batch.commit();
}

async function run(datasetPathArg?: string) {
  try {
    const base = datasetPathArg || path.join(process.cwd(), 'synthetic-ecommerce-dataset', 'small_dataset');
    console.log('Using dataset folder:', base);

    const users = readCSV(path.join(base, 'users.csv'));
    const products = readCSV(path.join(base, 'products.csv'));
    const orders = readCSV(path.join(base, 'orders.csv'));
    const orderItems = readCSV(path.join(base, 'order_items.csv'));
    const reviews = readCSV(path.join(base, 'reviews.csv'));

    console.log('Records:', { users: users.length, products: products.length, orders: orders.length, orderItems: orderItems.length, reviews: reviews.length });

    // 1) Create a default synthetic vendor so vendorId references exist
    const defaultVendorId = 'synthetic_vendor_imported';
    await firestoreAdmin.collection('vendors').doc(defaultVendorId).set({
      name: 'Synthetic Import Vendor',
      imported: true,
      createdAt: Timestamp.now(),
    }, { merge: true });

    // 2) Categories
    const categories = new Set<string>();
    for (const p of products) if (p.category) categories.add(p.category);
    await ensureCategoryDocs(categories);

    // 3) Users
    await writeInBatches(users, (batch, u) => {
      const id = String(u.user_id ?? u.userId ?? u.id);
      const ref = firestoreAdmin.collection('users').doc(id);
      batch.set(ref, {
        name: u.name || null,
        email: u.email || null,
        phone: u.phone || null,
        address: u.address || null,
        createdAt: toTimestamp(u.signup_date || u.signupDate),
        lastLogin: toTimestamp(u.last_login || u.lastLogin),
        membershipStatus: u.membership_status || u.membershipStatus || null,
        loyaltyPoints: u.loyalty_points ? Number(u.loyalty_points) : 0,
      }, { merge: true });
    });

    // 4) Products
    await writeInBatches(products, (batch, p) => {
      const id = String(p.product_id ?? p.productId ?? p.id);
      const ref = firestoreAdmin.collection('products').doc(id);
      batch.set(ref, {
        name: p.name || null,
        category: p.category || null,
        price: p.price ? Number(p.price) : 0,
        stock: p.stock_quantity ? Number(p.stock_quantity) : 0,
        rating: p.rating ? Number(p.rating) : null,
        vendorId: defaultVendorId,
        imported: true,
        createdAt: Timestamp.now(),
      }, { merge: true });
    });

    // build a product price map for order item enrichment
    const productPriceMap: Record<string, number> = {};
    for (const p of products) productPriceMap[String(p.product_id ?? p.productId ?? p.id)] = Number(p.price || 0);

    // 5) Orders (join items)
    const itemsByOrder: Record<string, any[]> = {};
    for (const it of orderItems) {
      const oid = String(it.order_id ?? it.orderId);
      if (!itemsByOrder[oid]) itemsByOrder[oid] = [];
      itemsByOrder[oid].push({ productId: String(it.product_id ?? it.productId), quantity: Number(it.quantity || 1), unitPrice: productPriceMap[String(it.product_id ?? it.productId)] || 0 });
    }

    await writeInBatches(orders, (batch, o) => {
      const id = String(o.order_id ?? o.orderId ?? o.id);
      const ref = firestoreAdmin.collection('orders').doc(id);
      const items = itemsByOrder[id] || [];
      batch.set(ref, {
        userId: String(o.user_id ?? o.userId),
        status: o.status || 'unknown',
        totalAmount: o.total_amount ? Number(o.total_amount) : items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0),
        items,
        createdAt: toTimestamp(o.order_date || o.orderDate),
        imported: true,
      }, { merge: true });
    });

    // 6) Reviews
    await writeInBatches(reviews, (batch, r) => {
      const id = String(r.review_id ?? r.reviewId ?? r.id);
      const ref = firestoreAdmin.collection('reviews').doc(id);
      batch.set(ref, {
        userId: String(r.user_id ?? r.userId),
        productId: String(r.product_id ?? r.productId),
        rating: r.rating ? Number(r.rating) : null,
        text: r.review_text || r.reviewText || null,
        createdAt: toTimestamp(r.review_date || r.reviewDate),
        imported: true,
      }, { merge: true });
    });

    console.log('Import completed successfully.');
  } catch (err) {
    console.error('Import error:', err);
    process.exit(1);
  }
}

// Run when invoked directly
if (require.main === module) {
  const arg = process.argv[2];
  run(arg).then(() => process.exit(0));
}
