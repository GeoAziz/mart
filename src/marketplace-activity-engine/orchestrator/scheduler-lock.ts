/**
 * Distributed Scheduler Lock with Fencing Tokens for MAE.
 *
 * Ensures only one simulation orchestrator can run at a time across
 * machines, GitHub Action runners, or processes.
 *
 * Stored at: simulation/locks/scheduler in Firestore.
 */

import { firestoreAdmin as db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export interface SchedulerLockData {
  ownerRunId: string;
  fencingToken: number;
  leasedAt: string;
  expiresAt: string; // ISO 8601
  status: 'acquired' | 'released';
}

export class ConcurrentSimulationBlockedError extends Error {
  constructor(message: string) {
    super(`[ConcurrentSimulationBlocked] ${message}`);
    this.name = 'ConcurrentSimulationBlockedError';
  }
}

export class SchedulerLockManager {
  private static readonly LOCK_COLLECTION = 'simulation';
  private static readonly LOCK_DOC = 'locks';
  private static readonly SCHEDULER_LOCK_ID = 'scheduler';
  private static readonly DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Attempts to acquire the distributed lease.
   * Throws ConcurrentSimulationBlockedError if held by another active run.
   */
  static async acquireLock(
    runId: string,
    ttlMs: number = SchedulerLockManager.DEFAULT_TTL_MS
  ): Promise<{ acquired: boolean; fencingToken: number }> {
    const lockRef = db
      .collection(SchedulerLockManager.LOCK_COLLECTION)
      .doc(SchedulerLockManager.LOCK_DOC)
      .collection('active')
      .doc(SchedulerLockManager.SCHEDULER_LOCK_ID);

    return db.runTransaction(async (transaction) => {
      const snap = await transaction.get(lockRef);
      const now = Date.now();
      let currentToken = 0;

      if (snap.exists) {
        const data = snap.data() as SchedulerLockData;
        currentToken = data.fencingToken || 0;
        const expiresAtMs = data.expiresAt ? new Date(data.expiresAt).getTime() : 0;

        // Check if lock is active and owned by another run
        if (data.status === 'acquired' && now < expiresAtMs && data.ownerRunId !== runId) {
          throw new ConcurrentSimulationBlockedError(
            `Simulation run '${runId}' blocked. Active lease held by '${data.ownerRunId}' until ${data.expiresAt}.`
          );
        }
      }

      const nextFencingToken = currentToken + 1;
      const leasedAt = new Date(now).toISOString();
      const expiresAt = new Date(now + ttlMs).toISOString();

      const newLock: SchedulerLockData = {
        ownerRunId: runId,
        fencingToken: nextFencingToken,
        leasedAt,
        expiresAt,
        status: 'acquired',
      };

      transaction.set(lockRef, newLock);
      return { acquired: true, fencingToken: nextFencingToken };
    });
  }

  /**
   * Renews/heartbeats an existing active lease.
   */
  static async refreshLock(
    runId: string,
    ttlMs: number = SchedulerLockManager.DEFAULT_TTL_MS
  ): Promise<void> {
    const lockRef = db
      .collection(SchedulerLockManager.LOCK_COLLECTION)
      .doc(SchedulerLockManager.LOCK_DOC)
      .collection('active')
      .doc(SchedulerLockManager.SCHEDULER_LOCK_ID);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(lockRef);
      if (!snap.exists) {
        throw new Error(`Cannot refresh lock: Lock does not exist.`);
      }

      const data = snap.data() as SchedulerLockData;
      if (data.ownerRunId !== runId) {
        throw new ConcurrentSimulationBlockedError(
          `Cannot refresh lock: Lock is owned by '${data.ownerRunId}', not '${runId}'.`
        );
      }

      const now = Date.now();
      transaction.update(lockRef, {
        expiresAt: new Date(now + ttlMs).toISOString(),
      });
    });
  }

  /**
   * Releases the lease cleanly upon run completion or failure.
   */
  static async releaseLock(runId: string): Promise<void> {
    const lockRef = db
      .collection(SchedulerLockManager.LOCK_COLLECTION)
      .doc(SchedulerLockManager.LOCK_DOC)
      .collection('active')
      .doc(SchedulerLockManager.SCHEDULER_LOCK_ID);

    try {
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(lockRef);
        if (!snap.exists) return;

        const data = snap.data() as SchedulerLockData;
        if (data.ownerRunId === runId) {
          transaction.update(lockRef, {
            status: 'released',
            releasedAt: new Date().toISOString(),
          });
        }
      });
    } catch (err: any) {
      console.warn(`[SchedulerLockManager] Warning during lock release: ${err.message}`);
    }
  }
}
