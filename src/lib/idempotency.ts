/**
 * Idempotency Utilities
 * ====================
 * 
 * Prevents duplicate orders when users accidentally double-click or refresh.
 * 
 * How it works:
 * 1. Client generates a unique idempotency key (UUID)
 * 2. Client sends this key in the X-Idempotency-Key header
 * 3. Server stores the key along with request result
 * 4. If same key is sent again, return cached result instead of processing
 * 5. Key expires after 24 hours
 */

import { firestoreAdmin } from '@/lib/firebase-admin';

interface IdempotencyRecord {
  key: string;
  result: any;
  createdAt: Date;
  expiresAt: Date;
  path: string;
  method: string;
}

// Store idempotency result
export async function storeIdempotencyResult(
  key: string,
  result: any,
  path: string,
  method: string
): Promise<void> {
  const collection = firestoreAdmin.collection('_idempotency_keys');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Expire after 24 hours

  await collection.doc(key).set({
    key,
    result,
    path,
    method,
    createdAt: new Date(),
    expiresAt,
  });
}

// Get idempotency result if it exists
export async function getIdempotencyResult(key: string): Promise<any | null> {
  const collection = firestoreAdmin.collection('_idempotency_keys');
  const doc = await collection.doc(key).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as IdempotencyRecord;

  // Check if expired
  const expiresAt = data.expiresAt instanceof Date ? data.expiresAt : new Date(data.expiresAt);
  if (new Date() > expiresAt) {
    await collection.doc(key).delete();
    return null;
  }

  return data.result;
}

// Generate UUID v4 (client-side)
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
}

// Cleanup expired keys (run as scheduled task)
export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  const collection = firestoreAdmin.collection('_idempotency_keys');
  const now = new Date();

  const expiredDocs = await collection.where('expiresAt', '<', now).get();

  let count = 0;
  for (const doc of expiredDocs.docs) {
    await doc.ref.delete();
    count++;
  }

  console.log(`[Idempotency] Cleaned up ${count} expired keys`);
  return count;
}
