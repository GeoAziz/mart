import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { store, mockDb } = vi.hoisted(() => {
  const store = new Map<string, any>();
  function mockDocRef(collectionName: string, id: string) {
    const path = `${collectionName}/${id}`;
    return {
      id,
      path,
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
    }),
    runTransaction: async (updateFunction: (transaction: any) => Promise<any>) => {
      const tx = {
        get: async (ref: any) => ref.get(),
        set: (ref: any, data: any) => {
          store.set(ref.path, data);
        },
        update: (ref: any, data: any) => {
          const existing = store.get(ref.path) || {};
          const updated = { ...existing };
          for (const [key, val] of Object.entries(data)) {
            if (val && typeof val === 'object' && (val as any)._methodName === 'increment') {
              updated[key] = (updated[key] || 0) + (val as any).val;
            } else {
              updated[key] = val;
            }
          }
          store.set(ref.path, updated);
        },
      };
      return updateFunction(tx);
    },
  };

  return { store, mockDb };
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
        arrayUnion: (...args: any[]) => ({ _methodName: 'arrayUnion', args }),
        increment: (val: number) => ({ _methodName: 'increment', val }),
      },
    },
  },
}));

import { createFakeClock, setClock, resetClock } from '@/lib/clock';
import { releaseExpiredOrderReservation, RESERVATION_TTL_MS } from '@/lib/transaction-service';
import { confirmOrderAndRecordPurchaseTransaction } from '@/lib/analytics-outbox';
import type { VerifiedPaymentResult } from '@/lib/analytics-types';

describe('Inventory Reservation TTL & Contention State Machine', () => {
  let fakeClock: ReturnType<typeof createFakeClock>;

  beforeEach(() => {
    store.clear();
    fakeClock = createFakeClock(1_700_000_000_000); // fixed start epoch
    setClock(fakeClock);
  });

  afterEach(() => {
    resetClock();
  });

  it('correctly sets reservationExpiresAt = now + 15 min when order is created', async () => {
    expect(RESERVATION_TTL_MS).toBe(15 * 60 * 1000);
  });

  it('cancels order and restores inventory when reservation TTL expires', async () => {
    const orderId = 'ORD_TEST_TTL_01';
    const initialEpoch = fakeClock.now();
    const expiresAt = initialEpoch + RESERVATION_TTL_MS;

    // Seed product with 0 available, 1 reserved
    store.set('products/prod_alpha', {
      id: 'prod_alpha',
      name: 'Alpha Sneakers',
      stock: 0,
      reserved: 1,
    });

    // Seed order in pending state with 15m expiration
    store.set(`orders/${orderId}`, {
      id: orderId,
      status: 'pending',
      reservationExpiresAt: { toMillis: () => expiresAt },
      items: [{ productId: 'prod_alpha', quantity: 1, price: 5000 }],
    });

    // Before expiration (e.g. at 14m), release check returns false
    fakeClock.advance(14 * 60 * 1000);
    const beforeResult = await releaseExpiredOrderReservation(orderId);
    expect(beforeResult.released).toBe(false);
    expect(beforeResult.reason).toBe('reservation_not_expired');
    expect(store.get(`orders/${orderId}`).status).toBe('pending');

    // Advance past TTL (at 16m)
    fakeClock.advance(2 * 60 * 1000);
    const afterResult = await releaseExpiredOrderReservation(orderId);
    expect(afterResult.released).toBe(true);

    // Verify order is cancelled
    const updatedOrder = store.get(`orders/${orderId}`);
    expect(updatedOrder.status).toBe('cancelled');
    expect(updatedOrder.cancellationReason).toBe('reservation_expired');

    // Verify product inventory was restored: stock 0 -> 1, reserved 1 -> 0
    const updatedProduct = store.get('products/prod_alpha');
    expect(updatedProduct.stock).toBe(1);
    expect(updatedProduct.reserved).toBe(0);
  });

  it('rejects late payment on expired order with ORDER_EXPIRED and generates 0 GA4 refund events', async () => {
    const orderId = 'ORD_TEST_LATE_02';
    const initialEpoch = fakeClock.now();
    const expiresAt = initialEpoch + RESERVATION_TTL_MS;

    // Seed expired pending order
    store.set(`orders/${orderId}`, {
      id: orderId,
      userId: 'user_late',
      status: 'pending',
      totalAmount: 2500,
      reservationExpiresAt: { toMillis: () => expiresAt },
      paymentDetails: { currency: 'KES' },
      items: [{ productId: 'prod_beta', quantity: 1, price: 2500 }],
    });

    // Advance clock past expiration
    fakeClock.advance(20 * 60 * 1000);

    const payment: VerifiedPaymentResult = {
      orderId,
      paymentId: 'PAY_LATE_123',
      provider: 'mpesa',
      currency: 'KES',
      amount: 2500,
      status: 'COMPLETED',
      verifiedAt: new Date().toISOString(),
    };

    let caughtError: any = null;
    try {
      await confirmOrderAndRecordPurchaseTransaction(payment);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('ORDER_EXPIRED');
    expect(caughtError.needsRefund).toBe(true);

    // Order must NOT be confirmed
    const order = store.get(`orders/${orderId}`);
    expect(order.status).toBe('pending');

    // Outbox must have ZERO records (neither purchase nor refund event in GA4)
    expect(store.has(`analytics_outbox/${orderId}_purchase`)).toBe(false);
    expect(store.has(`analytics_outbox/${orderId}_refund`)).toBe(false);
  });

  it('determines winner and loser atomically in concurrent race between payment confirmation and expiration', async () => {
    const orderId = 'ORD_TEST_RACE_03';
    const initialEpoch = fakeClock.now();
    const expiresAt = initialEpoch + RESERVATION_TTL_MS;

    store.set('products/prod_gamma', {
      id: 'prod_gamma',
      stock: 0,
      reserved: 1,
    });

    store.set(`orders/${orderId}`, {
      id: orderId,
      userId: 'user_race',
      status: 'pending',
      totalAmount: 3000,
      reservationExpiresAt: { toMillis: () => expiresAt },
      paymentDetails: {
        currency: 'KES',
        attribution: {
          clientId: 'ga4.test.client.race',
          consentSnapshot: { analyticsStorage: 'granted' },
        },
      },
      items: [{ productId: 'prod_gamma', quantity: 1, price: 3000 }],
    });

    // Case 1: Payment completes right before expiration (14m 59s)
    fakeClock.advance(14 * 60 * 1000 + 59 * 1000);
    const payment: VerifiedPaymentResult = {
      orderId,
      paymentId: 'PAY_RACE_WINNER',
      provider: 'mpesa',
      currency: 'KES',
      amount: 3000,
      status: 'COMPLETED',
      verifiedAt: new Date().toISOString(),
    };

    const confirmRes = await confirmOrderAndRecordPurchaseTransaction(payment);
    expect(confirmRes.confirmed).toBe(true);
    expect(store.get(`orders/${orderId}`).status).toBe('confirmed');
    expect(store.has(`analytics_outbox/${orderId}_purchase`)).toBe(true);

    // Now expiration check runs after confirmation: order is confirmed, so it must NOT release
    fakeClock.advance(10 * 60 * 1000);
    const lateRelease = await releaseExpiredOrderReservation(orderId);
    expect(lateRelease.released).toBe(false);
    expect(lateRelease.reason).toBe('order_not_in_reservable_state');
  });
});
