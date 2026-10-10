import { firestoreAdmin as db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { publishWSEvent } from '@/lib/ws-events';

/**
 * Worker to release reserved stock on abandoned carts (older than 30 mins).
 *
 * Runs inside a Firestore transaction per order so two concurrently-running
 * workers can never double-restore stock: the transaction re-reads the order
 * and only proceeds if it is still `pending`, giving the whole restore atomic
 * behaviour.
 */
export async function runReservationExpiryWorker() {
  console.log('🚀 Reservation Expiry Worker started');

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const snapshot = await db.collection('orders')
    .where('status', '==', 'pending')
    .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyMinutesAgo))
    .get();

  console.log(`[ReservationExpiry] Found ${snapshot.size} abandoned pending order(s)`);

  for (const doc of snapshot.docs) {
    const order = doc.data();

    try {
      await db.runTransaction(async (transaction) => {
        // Re-read inside the transaction: skip if another worker already cancelled it.
        const fresh = await transaction.get(doc.ref);
        if (!fresh.exists) return;
        const freshData = fresh.data()!;
        if (freshData.status !== 'pending') {
          console.log(`[ReservationExpiry] Order ${doc.id} no longer pending; skipping`);
          return;
        }

        // Restore stock and release the reservation atomically.
        for (const item of order.items || []) {
          if (!item.productId || !item.quantity) continue;
          const productRef = db.collection('products').doc(item.productId);
          transaction.update(productRef, {
            stock: admin.firestore.FieldValue.increment(item.quantity),
            reserved: admin.firestore.FieldValue.increment(-item.quantity),
            lastInventoryUpdate: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        transaction.update(doc.ref, {
          status: 'cancelled',
          statusHistory: admin.firestore.FieldValue.arrayUnion({
            status: 'cancelled',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            note: 'Reservation expired: order abandoned',
            updatedBy: 'system',
          }),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      console.log(`Releasing inventory for abandoned order: ${doc.id}`);

      publishWSEvent({
        type: 'inventory_alert',
        payload: {
          orderId: doc.id,
          message: `Stock restored for abandoned order #${doc.id.slice(0, 8).toUpperCase()}`,
          severity: 'info',
          timestamp: new Date().toISOString(),
        },
        roles: ['admin'],
      }).catch(() => {});
    } catch (error) {
      console.error(`[ReservationExpiry] Failed to release order ${doc.id}:`, error);
    }
  }
}
