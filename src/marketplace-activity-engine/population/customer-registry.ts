/**
 * Customer Identity Registry for MAE.
 * Reads and maintains persistent synthetic customer accounts in Firestore.
 */

import { firestoreAdmin as db } from '@/lib/firebase-admin';
import type { SyntheticCustomerAccount } from './types';

export class CustomerRegistry {
  private static readonly COLLECTION = 'simulation';
  private static readonly SUB_COLLECTION = 'accounts';
  private static readonly CUSTOMERS = 'customers';

  private static getCollectionRef() {
    return db
      .collection(CustomerRegistry.COLLECTION)
      .doc(CustomerRegistry.SUB_COLLECTION)
      .collection(CustomerRegistry.CUSTOMERS);
  }

  /**
   * Fetches all persistent synthetic customers from simulation storage.
   */
  static async listCustomers(): Promise<SyntheticCustomerAccount[]> {
    const snap = await CustomerRegistry.getCollectionRef().get();
    return snap.docs.map((doc) => doc.data() as SyntheticCustomerAccount);
  }

  /**
   * Fetches a specific synthetic customer by ID.
   */
  static async getCustomer(syntheticId: string): Promise<SyntheticCustomerAccount | null> {
    const doc = await CustomerRegistry.getCollectionRef().doc(syntheticId).get();
    if (!doc.exists) return null;
    return doc.data() as SyntheticCustomerAccount;
  }

  /**
   * Upserts a synthetic customer account.
   */
  static async saveCustomer(account: SyntheticCustomerAccount): Promise<void> {
    account.updatedAt = new Date().toISOString();
    await CustomerRegistry.getCollectionRef().doc(account.syntheticId).set(account, { merge: true });
  }

  /**
   * Updates stats after completing a journey or placing an order.
   */
  static async recordCustomerActivity(params: {
    syntheticId: string;
    dateStr: string;
    orderPlaced?: boolean;
  }): Promise<void> {
    const ref = CustomerRegistry.getCollectionRef().doc(params.syntheticId);
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) return;

      const data = snap.data() as SyntheticCustomerAccount;
      const stats = data.stats || {
        totalJourneysStarted: 0,
        totalOrdersPlaced: 0,
        lastActiveDate: '',
        repeatPurchaseCount: 0,
      };

      stats.totalJourneysStarted += 1;
      stats.lastActiveDate = params.dateStr;

      if (params.orderPlaced) {
        stats.totalOrdersPlaced += 1;
        if (stats.totalOrdersPlaced > 1) {
          stats.repeatPurchaseCount += 1;
        }
      }

      transaction.update(ref, {
        stats,
        updatedAt: new Date().toISOString(),
      });
    });
  }
}
