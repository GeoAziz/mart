/**
 * Inventory reservation helpers.
 *
 * Model: when an order is created, `stock` is decremented (prevents overselling)
 * and `reserved` is incremented (quantity held for a pending order). When the
 * payment confirms, `reserved` is decremented (reservation converted to a sale).
 * When an order is cancelled/refunded/expired, `stock` is restored AND `reserved`
 * is decremented.
 */
import { firestoreAdmin as db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

function itemRefs(items: any[]) {
  return items.filter((item) => item?.productId && item?.quantity);
}

/**
 * Release reservations only (payment confirmed): reserved -= qty per item.
 */
export async function releaseReservations(orderId: string): Promise<void> {
  const orderDoc = await db.collection('orders').doc(orderId).get();
  if (!orderDoc.exists) return;

  const items = itemRefs(orderDoc.data()?.items || []);
  if (items.length === 0) return;

  const batch = db.batch();
  for (const item of items) {
    batch.update(db.collection('products').doc(item.productId), {
      reserved: admin.firestore.FieldValue.increment(-item.quantity),
    });
  }
  await batch.commit();
}

/**
 * Restore stock AND release reservations (cancelled / refunded / expired).
 */
export async function restoreStockForOrder(orderId: string): Promise<void> {
  const orderDoc = await db.collection('orders').doc(orderId).get();
  if (!orderDoc.exists) return;

  const items = itemRefs(orderDoc.data()?.items || []);
  if (items.length === 0) return;

  const batch = db.batch();
  for (const item of items) {
    batch.update(db.collection('products').doc(item.productId), {
      stock: admin.firestore.FieldValue.increment(item.quantity),
      reserved: admin.firestore.FieldValue.increment(-item.quantity),
      lastInventoryUpdate: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}
