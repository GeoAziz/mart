import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SchedulerLockManager,
  ConcurrentSimulationBlockedError,
  SchedulerLockData,
} from '@/marketplace-activity-engine/orchestrator/scheduler-lock';
import { firestoreAdmin as db } from '@/lib/firebase-admin';

vi.mock('@/lib/firebase-admin', () => {
  let mockStore: Record<string, any> = {};

  return {
    firestoreAdmin: {
      collection: (col: string) => ({
        doc: (d1: string) => ({
          collection: (subCol: string) => ({
            doc: (lockId: string) => {
              const path = `${col}/${d1}/${subCol}/${lockId}`;
              return {
                path,
                get: vi.fn(async () => ({
                  exists: Boolean(mockStore[path]),
                  data: () => mockStore[path],
                })),
                set: vi.fn(async (data: any) => {
                  mockStore[path] = { ...data };
                }),
                update: vi.fn(async (data: any) => {
                  mockStore[path] = { ...mockStore[path], ...data };
                }),
              };
            },
          }),
        }),
      }),
      runTransaction: async (fn: any) => {
        const path = 'simulation/locks/active/scheduler';
        const transaction = {
          get: vi.fn(async () => ({
            exists: Boolean(mockStore[path]),
            data: () => mockStore[path],
          })),
          set: vi.fn((ref: any, data: any) => {
            mockStore[path] = { ...data };
          }),
          update: vi.fn((ref: any, data: any) => {
            mockStore[path] = { ...mockStore[path], ...data };
          }),
        };
        return fn(transaction);
      },
      __resetMockStore: () => {
        mockStore = {};
      },
    },
  };
});

describe('SchedulerLockManager', () => {
  beforeEach(() => {
    (db as any).__resetMockStore();
  });

  it('acquires lock when no active lease exists', async () => {
    const result = await SchedulerLockManager.acquireLock('run_001', 60000);
    expect(result.acquired).toBe(true);
    expect(result.fencingToken).toBe(1);
  });

  it('increments fencing token on subsequent acquired runs', async () => {
    const run1 = await SchedulerLockManager.acquireLock('run_001', 60000);
    expect(run1.fencingToken).toBe(1);

    await SchedulerLockManager.releaseLock('run_001');

    const run2 = await SchedulerLockManager.acquireLock('run_002', 60000);
    expect(run2.fencingToken).toBe(2);
  });

  it('rejects concurrent execution while an active lease is held', async () => {
    await SchedulerLockManager.acquireLock('run_001', 60000);

    await expect(SchedulerLockManager.acquireLock('run_002', 60000)).rejects.toThrow(
      ConcurrentSimulationBlockedError
    );
  });

  it('allows same runId to re-acquire / extend lease', async () => {
    const run1 = await SchedulerLockManager.acquireLock('run_001', 60000);
    const run1Re = await SchedulerLockManager.acquireLock('run_001', 60000);

    expect(run1Re.acquired).toBe(true);
    expect(run1Re.fencingToken).toBe(run1.fencingToken + 1);
  });

  it('allows acquisition if previous lease expired', async () => {
    // Acquire with negative TTL (already expired)
    await SchedulerLockManager.acquireLock('run_old', -1000);

    const runNew = await SchedulerLockManager.acquireLock('run_new', 60000);
    expect(runNew.acquired).toBe(true);
    expect(runNew.fencingToken).toBe(2);
  });
});
