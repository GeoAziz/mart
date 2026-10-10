import { firestoreAdmin } from '@/lib/firebase-admin';

async function auditCollection(name: string) {
  try {
    const ref = firestoreAdmin.collection(name);
    const snap = await ref.limit(2).get();
    console.log(`\n--- ${name.toUpperCase()} (Showing up to 2 items) ---`);
    if (snap.empty) {
      console.log('Collection is empty.');
    } else {
      snap.forEach(doc => {
        console.log(`\nDoc ID: ${doc.id}`);
        const data = doc.data();
        // Print data nicely, truncate long strings if any
        console.log(JSON.stringify(data, (key, val) => {
          if (typeof val === 'string' && val.length > 100) return val.substring(0, 100) + '...';
          return val;
        }, 2));
      });
    }
  } catch (err) {
    console.error(`Error reading ${name}:`, err);
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

  console.log('Auditing Firestore database sample data...');
  for (const c of collections) {
    await auditCollection(c);
  }
  process.exit(0);
}

main();

