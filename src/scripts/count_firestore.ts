import { firestoreAdmin } from '@/lib/firebase-admin';

async function countCollection(name: string) {
  try {
    const ref = firestoreAdmin.collection(name);
    const snap = await ref.limit(1).get();
    // If there are few docs, get size directly; otherwise use count aggregation
    const approx = snap.size;
    // Try aggregation count (requires Firestore server support)
    try {
      // @ts-ignore - count() may not be in types but exists at runtime
      const agg = await (ref.count() as any).get();
      const total = agg?.data()?.count ?? approx;
      console.log(`${name}: ${total}`);
      return total;
    } catch (e) {
      // Fallback: if small, read all
      const full = await ref.get();
      console.log(`${name}: ${full.size}`);
      return full.size;
    }
  } catch (err) {
    console.error(`Error counting ${name}:`, err);
    return -1;
  }
}

async function main() {
  const collections = [
    'users',
    'products',
    'orders',
    'reviews',
    'vendors',
    'categories'
  ];

  console.log('Counting Firestore collections...');
  const results: Record<string, number> = {};
  for (const c of collections) {
    const n = await countCollection(c);
    results[c] = n;
  }

  console.log('Summary:', results);
  process.exit(0);
}

if (require.main === module) main();
