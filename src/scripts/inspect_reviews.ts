import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';

async function main() {
  const reviewsSnapshot = await firestoreAdmin.collection('reviews').limit(5).get();
  const reviews = reviewsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log('Sample reviews:', JSON.stringify(reviews, null, 2));
}

main().catch(console.error);
