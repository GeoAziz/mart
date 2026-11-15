import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FencedOutboxManager, FencedOutboxRecord } from '@/marketplace-activity-engine/orchestrator/fenced-outbox';
import { firestoreAdmin as db } from '@/lib/firebase-admin';

vi.mock('@/lib/firebase-admin', () => {
  const store = new Map<string, any>();
  return {
    firestoreAdmin: {
      collection: (colName: string) => ({
        doc: (docId: string) => ({
          get: vi.fn(async () => {
            const data = store.get(`${colName}/${docId}`);
            return {
              exists: !!data,
              data: () => data,
            };
          }),
          set: vi.fn(async (val: any) => {
            store.set(`${colName}/${docId}`, val);
          }),
          update: vi.fn(async (val: any) => {
            const existing = store.get(`${colName}/${docId}`) || {};
            store.set(`${colName}/${docId}`, { ...existing, ...val });
          }),
        }),
      }),
      runTransaction: vi.fn(async (cb: (txn: any) => Promise<any>) => {
        const txn = {
          get: async (ref: any) => ref.get(),
          update: (ref: any, val: any) => ref.update(val),
          set: (ref: any, val: any) => ref.set(val),
        };
        return cb(txn);
      }),
    },
  };
});

describe('Fenced Outbox Engine (v4.1)', () => {
  it('builds records with deterministic idempotency keys and zero fencing tokens', () => {
    const record = FencedOutboxManager.buildRecord({
      eventType: 'purchase',
      idempotencyKey: 'purchase:ord_20261107_9812',
      actorId: 'cust_sim_0001',
      runId: 'run_test_01',
      payload: {
        client_id: '12345.1730000000',
        events: [{ name: 'purchase', params: { transaction_id: 'ord_20261107_9812', value: 45000 } }],
      },
      orderId: 'ord_20261107_9812',
    });

    expect(record.id).toBe('purchase_purchase_ord_20261107_9812');
    expect(record.status).toBe('pending');
    expect(record.fencingToken).toBe(0);
    expect(record.leaseOwner).toBeNull();
  });

  it('monotonically increments fencing token upon lease acquisition', async () => {
    const record = FencedOutboxManager.buildRecord({
      eventType: 'purchase',
      idempotencyKey: 'purchase:ord_1',
      actorId: 'cust_1',
      runId: 'run_1',
      payload: { client_id: '1.1', events: [] },
    });

    const docRef = db.collection('analytics_outbox').doc('test_doc');
    await docRef.set(record);

    const claim1 = await FencedOutboxManager.claimLease(docRef as any, 'worker_A');
    expect(claim1.claimed).toBe(true);
    expect(claim1.fencingToken).toBe(1);

    // Stale worker tries to commit with wrong token
    const staleCommit = await FencedOutboxManager.commitDispatch(
      docRef as any,
      claim1.leaseId,
      0, // Stale token
      { statusCode: 204, accepted: true }
    );
    expect(staleCommit).toBe(false);

    // Legitimate worker commits with valid token
    const validCommit = await FencedOutboxManager.commitDispatch(
      docRef as any,
      claim1.leaseId,
      claim1.fencingToken,
      { statusCode: 204, accepted: true }
    );
    expect(validCommit).toBe(true);

    const updatedSnap = await docRef.get();
    expect(updatedSnap.data().status).toBe('accepted_by_endpoint');
  });
});
