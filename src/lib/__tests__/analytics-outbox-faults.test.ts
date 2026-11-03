import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { store, mockDb, mockServer } = vi.hoisted(() => {
  const store = new Map<string, any>();
  function mockDocRef(collectionName: string, id: string) {
    const path = `${collectionName}/${id}`;
    return {
      id,
      path,
      ref: { id, path },
      get: async () => ({
        id,
        exists: store.has(path),
        data: () => store.get(path),
      }),
      set: async (data: any) => {
        store.set(path, data);
      },
      update: async (data: any) => {
        const existing = store.get(path) || {};
        store.set(path, { ...existing, ...data });
      },
    };
  }

  const mockDb = {
    collection: (name: string) => ({
      doc: (id?: string) => mockDocRef(name, id || 'mock_doc_id'),
      where: (field: string, op: string, val: any) => ({
        limit: (n: number) => ({
          get: async () => {
            const matches: any[] = [];
            for (const [key, data] of store.entries()) {
              if (key.startsWith(`${name}/`)) {
                if (data[field] === val) {
                  matches.push({
                    id: data.id || key.split('/')[1],
                    ref: mockDocRef(name, data.id || key.split('/')[1]),
                    data: () => data,
                  });
                }
              }
            }
            return {
              docs: matches.slice(0, n),
              empty: matches.length === 0,
            };
          },
        }),
      }),
    }),
    runTransaction: async (updateFunction: (transaction: any) => Promise<any>) => {
      const tx = {
        get: async (ref: any) => {
          const doc = mockDocRef(ref.path.split('/')[0], ref.id);
          return doc.get();
        },
        set: (ref: any, data: any) => {
          store.set(ref.path, data);
        },
        update: (ref: any, data: any) => {
          const existing = store.get(ref.path) || {};
          store.set(ref.path, { ...existing, ...data });
        },
      };
      return updateFunction(tx);
    },
  };

  const mockServer = {
    dispatchGA4Purchase: vi.fn(),
    dispatchGA4Refund: vi.fn(),
  };

  return { store, mockDb, mockServer };
});

vi.mock('@/lib/firebase-admin', () => ({
  firestoreAdmin: mockDb,
  db: mockDb,
}));

vi.mock('firebase-admin', () => ({
  default: {
    firestore: {
      Timestamp: {
        now: () => ({ toMillis: () => Date.now() }),
        fromMillis: (ms: number) => ({ toMillis: () => ms }),
      },
      FieldValue: {
        serverTimestamp: () => ({ _methodName: 'serverTimestamp' }),
      },
    },
  },
}));

vi.mock('@/lib/analytics-server', () => ({
  dispatchGA4Purchase: mockServer.dispatchGA4Purchase,
  dispatchGA4Refund: mockServer.dispatchGA4Refund,
}));

import { createFakeClock, setClock, resetClock } from '@/lib/clock';
import { processOutboxBatch } from '@/lib/analytics-worker';
import type { AnalyticsOutboxRecord } from '@/lib/analytics-types';

describe('Analytics Outbox Fault Injection & Resilience', () => {
  let fakeClock: ReturnType<typeof createFakeClock>;

  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
    fakeClock = createFakeClock(1_700_000_000_000);
    setClock(fakeClock);
  });

  afterEach(() => {
    resetClock();
  });

  it('backs off with transient 5xx from Google and retries later', async () => {
    const recordId = 'ORD_FAULT_5XX_purchase';
    const initialEpoch = fakeClock.now();

    store.set(`analytics_outbox/${recordId}`, {
      id: recordId,
      orderId: 'ORD_FAULT_5XX',
      eventType: 'purchase',
      status: 'pending',
      attemptCount: 0,
      maxAttempts: 5,
      nextAttemptAt: { toMillis: () => initialEpoch },
      payload: {
        transaction_id: 'ORD_FAULT_5XX',
        value: 1200,
        currency: 'KES',
        shipping: 0,
        tax: 0,
        payment_method: 'mpesa',
        items: [{ item_id: 'p1', item_name: 'P1', price: 1200, quantity: 1 }],
        attribution: {
          clientId: 'client_5xx_test',
          consentSnapshot: { analyticsStorage: 'granted' },
        },
      },
    } as AnalyticsOutboxRecord);

    // Mock Google returning 503 Service Unavailable (transient error)
    mockServer.dispatchGA4Purchase.mockResolvedValueOnce({
      accepted: false,
      statusCode: 503,
      isTransient: true,
      errorMessage: 'GA4 Measurement Protocol rejected with HTTP 503',
    });

    const result = await processOutboxBatch({ batchSize: 5 });
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);

    const record = store.get(`analytics_outbox/${recordId}`);
    expect(record.status).toBe('pending');
    expect(record.attemptCount).toBe(1);
    expect(record.lastErrorCode).toBe('503');
    // nextAttemptAt must be scheduled in the future (backoff)
    expect(record.nextAttemptAt.toMillis()).toBeGreaterThan(initialEpoch);
  });

  it('transitions immediately to dead_letter on non-transient 4xx error without wasting retries', async () => {
    const recordId = 'ORD_FAULT_400_purchase';
    const initialEpoch = fakeClock.now();

    store.set(`analytics_outbox/${recordId}`, {
      id: recordId,
      orderId: 'ORD_FAULT_400',
      eventType: 'purchase',
      status: 'pending',
      attemptCount: 0,
      maxAttempts: 5,
      nextAttemptAt: { toMillis: () => initialEpoch },
      payload: {
        transaction_id: 'ORD_FAULT_400',
        value: 1200,
        currency: 'KES',
        shipping: 0,
        tax: 0,
        payment_method: 'mpesa',
        items: [{ item_id: 'p1', item_name: 'P1', price: 1200, quantity: 1 }],
        attribution: {
          clientId: 'client_bad_schema',
          consentSnapshot: { analyticsStorage: 'granted' },
        },
      },
    } as AnalyticsOutboxRecord);

    // Mock Google returning non-transient 400 Bad Request
    mockServer.dispatchGA4Purchase.mockResolvedValueOnce({
      accepted: false,
      statusCode: 400,
      isTransient: false,
      errorMessage: 'Bad Request - Invalid parameter format',
    });

    const result = await processOutboxBatch({ batchSize: 5 });
    expect(result.deadLetter).toBe(1);
    expect(result.failed).toBe(0);

    const record = store.get(`analytics_outbox/${recordId}`);
    expect(record.status).toBe('dead_letter');
    expect(record.attemptCount).toBe(1);
    expect(record.lastErrorCode).toBe('400');
  });

  it('recovers crashed worker lease when clock advances past lease duration', async () => {
    const recordId = 'ORD_LEASE_CRASH_purchase';
    const initialEpoch = fakeClock.now();

    // Worker A crashed mid-execution with status = 'processing' and leaseExpiresAt = +60s
    store.set(`analytics_outbox/${recordId}`, {
      id: recordId,
      orderId: 'ORD_LEASE_CRASH',
      eventType: 'purchase',
      status: 'processing',
      attemptCount: 1,
      maxAttempts: 5,
      lockedBy: 'worker_crashed_pid_9999',
      leaseId: 'lease_stale_12345',
      leaseExpiresAt: { toMillis: () => initialEpoch + 60_000 },
      payload: {
        transaction_id: 'ORD_LEASE_CRASH',
        value: 3000,
        currency: 'KES',
        shipping: 0,
        tax: 0,
        payment_method: 'mpesa',
        items: [{ item_id: 'p3', item_name: 'P3', price: 3000, quantity: 1 }],
        attribution: {
          clientId: 'client_recovery',
          consentSnapshot: { analyticsStorage: 'granted' },
        },
      },
    } as AnalyticsOutboxRecord);

    // Run batch before lease expires: should NOT claim
    const earlyBatch = await processOutboxBatch({ batchSize: 5, workerId: 'worker_healthy_01' });
    expect(earlyBatch.sent).toBe(0);
    expect(store.get(`analytics_outbox/${recordId}`).lockedBy).toBe('worker_crashed_pid_9999');

    // Advance fake clock past the 60s lease expiry (e.g. 70s later)
    fakeClock.advance(70_000);

    mockServer.dispatchGA4Purchase.mockResolvedValueOnce({
      accepted: true,
      statusCode: 204,
      isTransient: false,
    });

    const recoveryBatch = await processOutboxBatch({ batchSize: 5, workerId: 'worker_healthy_01' });
    expect(recoveryBatch.sent).toBe(1);

    const recovered = store.get(`analytics_outbox/${recordId}`);
    expect(recovered.status).toBe('sent');
    expect(recovered.attemptCount).toBe(2);
    expect(recovered.leaseId).toBeNull();
  });
});

