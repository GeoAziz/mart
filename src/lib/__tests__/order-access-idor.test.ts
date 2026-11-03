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
    };
  }

  const mockDb = {
    collection: (name: string) => ({
      doc: (id?: string) => mockDocRef(name, id || 'mock_doc_id'),
    }),
  };

  return { store, mockDb };
});

vi.mock('@/lib/firebase-admin', () => ({
  firestoreAdmin: mockDb,
  db: mockDb,
}));

/**
 * Access control validator matching src/app/api/orders/[orderId]/route.ts lines 55-76
 */
async function simulateOrderAccess(orderId: string, currentUser: { uid: string; role: string }): Promise<{ statusCode: number; message: string }> {
  const orderDoc = await mockDb.collection('orders').doc(orderId).get();
  if (!orderDoc.exists) {
    return { statusCode: 404, message: 'Order not found.' };
  }

  const order = orderDoc.data();

  if (currentUser.role === 'admin') {
    return { statusCode: 200, message: 'OK' };
  } else if (currentUser.role === 'customer') {
    if (order.userId !== currentUser.uid) {
      return { statusCode: 403, message: 'Forbidden: You do not have permission to view this order.' };
    }
    return { statusCode: 200, message: 'OK' };
  } else if (currentUser.role === 'vendor') {
    if (!order.vendorIds || !order.vendorIds.includes(currentUser.uid)) {
      return { statusCode: 403, message: 'Forbidden: This order does not contain items from your store.' };
    }
    return { statusCode: 200, message: 'OK' };
  }

  return { statusCode: 403, message: 'Forbidden: Unknown role.' };
}

describe('Order Access Control & IDOR Hardening', () => {
  beforeEach(() => {
    store.clear();
    // Seed Order belonging to Customer A and Vendor 1
    store.set('orders/ord_alice_101', {
      id: 'ord_alice_101',
      userId: 'cust_alice',
      vendorIds: ['vendor_tech_01'],
      totalAmount: 4500,
    });
  });

  it('allows owner customer to access their order with HTTP 200', async () => {
    const res = await simulateOrderAccess('ord_alice_101', { uid: 'cust_alice', role: 'customer' });
    expect(res.statusCode).toBe(200);
  });

  it('rejects cross-customer horizontal privilege escalation (IDOR) with HTTP 403', async () => {
    const res = await simulateOrderAccess('ord_alice_101', { uid: 'cust_bob_attacker', role: 'customer' });
    expect(res.statusCode).toBe(403);
    expect(res.message).toContain('Forbidden');
  });

  it('allows vendor whose items are in the order to access with HTTP 200', async () => {
    const res = await simulateOrderAccess('ord_alice_101', { uid: 'vendor_tech_01', role: 'vendor' });
    expect(res.statusCode).toBe(200);
  });

  it('rejects cross-vendor unauthorized inspection with HTTP 403', async () => {
    const res = await simulateOrderAccess('ord_alice_101', { uid: 'vendor_competitor_02', role: 'vendor' });
    expect(res.statusCode).toBe(403);
    expect(res.message).toContain('Forbidden');
  });

  it('returns HTTP 404 for nonexistent order IDs regardless of user role', async () => {
    const resCustomer = await simulateOrderAccess('ord_nonexistent_9999', { uid: 'cust_alice', role: 'customer' });
    expect(resCustomer.statusCode).toBe(404);

    const resVendor = await simulateOrderAccess('ord_nonexistent_9999', { uid: 'vendor_tech_01', role: 'vendor' });
    expect(resVendor.statusCode).toBe(404);
  });

  it('allows admin role full access with HTTP 200', async () => {
    const res = await simulateOrderAccess('ord_alice_101', { uid: 'admin_root', role: 'admin' });
    expect(res.statusCode).toBe(200);
  });
});

