/**
 * Vendor Identity Registry for MAE.
 * Reads and maintains persistent synthetic vendor accounts in Firestore.
 */

import { firestoreAdmin as db } from '@/lib/firebase-admin';
import type { SyntheticVendorAccount } from './types';

export class VendorRegistry {
  private static readonly COLLECTION = 'simulation';
  private static readonly SUB_COLLECTION = 'accounts';
  private static readonly VENDORS = 'vendors';

  private static getCollectionRef() {
    return db
      .collection(VendorRegistry.COLLECTION)
      .doc(VendorRegistry.SUB_COLLECTION)
      .collection(VendorRegistry.VENDORS);
  }

  /**
   * Fetches all persistent synthetic vendors from simulation storage.
   */
  static async listVendors(): Promise<SyntheticVendorAccount[]> {
    const snap = await VendorRegistry.getCollectionRef().get();
    return snap.docs.map((doc) => doc.data() as SyntheticVendorAccount);
  }

  /**
   * Fetches a specific synthetic vendor by ID.
   */
  static async getVendor(syntheticId: string): Promise<SyntheticVendorAccount | null> {
    const doc = await VendorRegistry.getCollectionRef().doc(syntheticId).get();
    if (!doc.exists) return null;
    return doc.data() as SyntheticVendorAccount;
  }

  /**
   * Upserts a synthetic vendor account.
   */
  static async saveVendor(account: SyntheticVendorAccount): Promise<void> {
    account.updatedAt = new Date().toISOString();
    await VendorRegistry.getCollectionRef().doc(account.syntheticId).set(account, { merge: true });
  }

  /**
   * Updates vendor order processing statistics.
   */
  static async recordVendorActivity(params: {
    syntheticId: string;
    action: 'received' | 'accepted' | 'fulfilled' | 'rejected';
    delayMs?: number;
    dateStr: string;
  }): Promise<void> {
    const ref = VendorRegistry.getCollectionRef().doc(params.syntheticId);
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) return;

      const data = snap.data() as SyntheticVendorAccount;
      const stats = data.stats || {
        ordersReceived: 0,
        ordersAccepted: 0,
        ordersFulfilled: 0,
        ordersRejected: 0,
        averageAcceptanceDelayMs: 0,
        lastActiveDate: '',
      };

      stats.lastActiveDate = params.dateStr;

      if (params.action === 'received') {
        stats.ordersReceived += 1;
      } else if (params.action === 'accepted') {
        const count = stats.ordersAccepted;
        stats.ordersAccepted += 1;
        if (params.delayMs !== undefined) {
          stats.averageAcceptanceDelayMs = (stats.averageAcceptanceDelayMs * count + params.delayMs) / (count + 1);
        }
      } else if (params.action === 'fulfilled') {
        stats.ordersFulfilled += 1;
      } else if (params.action === 'rejected') {
        stats.ordersRejected += 1;
      }

      transaction.update(ref, {
        stats,
        updatedAt: new Date().toISOString(),
      });
    });
  }
}
