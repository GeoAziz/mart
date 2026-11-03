import { describe, it, expect, vi, beforeEach } from 'vitest';

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
      // We simulate atomic execution
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

/**
 * Simulates atomic reservation transaction for an order
 */
async function simulateAtomicOrderReservation(
  orderId: string,
  userId: string,
  productId: string,
  quantity: number
): Promise<{ success: boolean; statusCode: number; error?: string }> {
  try {
    return await mockDb.runTransaction(async (transaction) => {
      const productRef = mockDb.collection('products').doc(productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists) {
        return { success: false, statusCode: 404, error: 'Product not found' };
      }

      const product = productSnap.data();
      const currentStock = product.stock ?? 0;

      if (currentStock < quantity) {
        return {
          success: false,
          statusCode: 409,
          error: `Insufficient stock for ${product.name}. Available: ${currentStock}, Requested: ${quantity}`,
        };
      }

      // Decrement stock, increment reserved
      transaction.update(productRef, {
        stock: currentStock - quantity,
        reserved: { _methodName: 'increment', val: quantity },
      });

      // Create order
      const orderRef = mockDb.collection('orders').doc(orderId);
      transaction.set(orderRef, {
        id: orderId,
        userId,
        status: 'pending',
        items: [{ productId, quantity }],
      });

      return { success: true, statusCode: 201 };
    });
  } catch (err: any) {
    return { success: false, statusCode: 500, error: err.message };
  }
}

describe('Inventory Contention Simulation (Scenarios A & B)', () => {
  beforeEach(() => {
    store.clear();
  });

  describe('Scenario A: 50 Contention Runs for 1-Unit Stock Product', () => {
    it('executes 50 contention rounds asserting exactly 1 winner (201), 1 loser (409), and 0 oversold units', async () => {
      let totalWinners = 0;
      let totalLosers = 0;

      for (let run = 1; run <= 50; run++) {
        const prodId = `prod_contention_a_run_${run}`;
        store.set(`products/${prodId}`, {
          id: prodId,
          name: `Contention A Item #${run}`,
          stock: 1,
          reserved: 0,
        });

        const orderA = `ord_contention_a_${run}_user1`;
        const orderB = `ord_contention_a_${run}_user2`;

        // Barrier synchronization: simulate simultaneous attempts
        const [res1, res2] = await Promise.all([
          simulateAtomicOrderReservation(orderA, 'cust_1', prodId, 1),
          simulateAtomicOrderReservation(orderB, 'cust_2', prodId, 1),
        ]);

        const results = [res1, res2];
        const winners = results.filter((r) => r.statusCode === 201);
        const losers = results.filter((r) => r.statusCode === 409);

        expect(winners.length).toBe(1);
        expect(losers.length).toBe(1);

        totalWinners += winners.length;
        totalLosers += losers.length;

        // Verify invariant: final stock = 0, reserved = 1, oversold = 0
        const finalProduct = store.get(`products/${prodId}`);
        expect(finalProduct.stock).toBe(0);
        expect(finalProduct.reserved).toBe(1);
      }

      expect(totalWinners).toBe(50);
      expect(totalLosers).toBe(50);
    });
  });

  describe('Scenario B: Stock = 2 with Asymmetric Demands (User 1 wants 2, User 2 wants 1)', () => {
    it('executes 50 contention rounds asserting mutually exclusive valid outcomes with 0 oversold units', async () => {
      let outcome1Count = 0; // User 1 wins (takes 2), User 2 gets 409
      let outcome2Count = 0; // User 2 wins (takes 1), User 1 gets 409

      for (let run = 1; run <= 50; run++) {
        const prodId = `prod_contention_b_run_${run}`;
        store.set(`products/${prodId}`, {
          id: prodId,
          name: `Contention B Item #${run}`,
          stock: 2,
          reserved: 0,
        });

        const orderUser1 = `ord_contention_b_${run}_u1`; // wants 2
        const orderUser2 = `ord_contention_b_${run}_u2`; // wants 1

        // Execute concurrent requests
        const [res1, res2] = await Promise.all([
          simulateAtomicOrderReservation(orderUser1, 'cust_1', prodId, 2),
          simulateAtomicOrderReservation(orderUser2, 'cust_2', prodId, 1),
        ]);

        const finalProduct = store.get(`products/${prodId}`);

        if (res1.statusCode === 201 && res2.statusCode === 409) {
          // Outcome 1
          outcome1Count++;
          expect(finalProduct.stock).toBe(0);
          expect(finalProduct.reserved).toBe(2);
        } else if (res1.statusCode === 409 && res2.statusCode === 201) {
          // Outcome 2
          outcome2Count++;
          expect(finalProduct.stock).toBe(1);
          expect(finalProduct.reserved).toBe(1);
        } else {
          throw new Error(`Invalid non-atomic contention outcome: res1=${res1.statusCode}, res2=${res2.statusCode}`);
        }

        // Invariant: stock never drops below 0
        expect(finalProduct.stock).toBeGreaterThanOrEqual(0);
      }

      expect(outcome1Count + outcome2Count).toBe(50);
    });
  });
});
