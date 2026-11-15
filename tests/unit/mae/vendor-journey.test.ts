import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VendorJourneyAgent } from '@/marketplace-activity-engine/journeys/vendor-journey';
import { SeededPRNG } from '@/marketplace-activity-engine/orchestrator/schedule-resolver';
import { EventLedger } from '@/marketplace-activity-engine/ledger/event-ledger';
import { VendorRegistry } from '@/marketplace-activity-engine/population/vendor-registry';
import { firestoreAdmin as db } from '@/lib/firebase-admin';

vi.mock('@/lib/firebase-admin', () => {
  let mockStore: Record<string, any> = {};

  return {
    firestoreAdmin: {
      collection: (col: string) => ({
        doc: (id: string) => ({
          get: vi.fn(async () => ({
            exists: Boolean(mockStore[`${col}/${id}`]),
            data: () => mockStore[`${col}/${id}`],
          })),
          set: vi.fn(async (data: any) => {
            mockStore[`${col}/${id}`] = { ...data };
          }),
          update: vi.fn(async (data: any) => {
            mockStore[`${col}/${id}`] = { ...mockStore[`${col}/${id}`], ...data };
          }),
        }),
      }),
      __setDoc: (path: string, data: any) => {
        mockStore[path] = data;
      },
      __getDoc: (path: string) => mockStore[path],
      __resetMockStore: () => {
        mockStore = {};
      },
    },
  };
});

describe('VendorJourneyAgent', () => {
  beforeEach(() => {
    (db as any).__resetMockStore();
    vi.spyOn(EventLedger, 'recordEvent').mockImplementation(async () => {});
    vi.spyOn(VendorRegistry, 'recordVendorActivity').mockImplementation(async () => {});
  });

  const mockVendor: any = {
    syntheticId: 'vend_sim_0001',
    authUid: 'auth_vend_0001',
    storeName: 'Sim Electronics',
    synthetic: true,
    profileId: 'fast_fulfiller_v1', // 98% acceptance
    catalogProductIds: ['p1'],
    cohortDate: '2026-09-01',
    lifecycleState: 'active',
    stats: { ordersReceived: 0, ordersAccepted: 0, ordersFulfilled: 0, ordersRejected: 0 },
  };

  it('accepts and fulfills an assigned order within SLA', async () => {
    (db as any).__setDoc('orders/sim_ord_100', {
      id: 'sim_ord_100',
      status: 'confirmed',
      synthetic: true,
    });

    const prng = new SeededPRNG(42);
    const agent = new VendorJourneyAgent({
      vendor: mockVendor,
      runId: 'run_test_01',
      prng,
      environment: 'emulator',
    });

    const result = await agent.processOrder('sim_ord_100', '2026-11-09');

    expect(result.status).toBe('accepted_and_fulfilled');
    expect(result.withinSLA).toBe(true);

    const updatedOrder = (db as any).__getDoc('orders/sim_ord_100');
    expect(updatedOrder.status).toBe('delivered');
    expect(updatedOrder.trackingNumber).toBeDefined();

    expect(EventLedger.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'synthetic_order_accepted' })
    );
    expect(EventLedger.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'synthetic_order_fulfilled' })
    );
    expect(VendorRegistry.recordVendorActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'fulfilled' })
    );
  });

  it('handles vendor order rejection when profile triggers capacity limit', async () => {
    const capacityConstrainedVendor: any = {
      ...mockVendor,
      profileId: 'capacity_constrained_v1', // 25% rejection rate
    };

    (db as any).__setDoc('orders/sim_ord_200', {
      id: 'sim_ord_200',
      status: 'pending',
      synthetic: true,
    });

    // PRNG configured so acceptance roll (> 0.75) triggers rejection
    const prng = new SeededPRNG(42);
    vi.spyOn(prng, 'next').mockReturnValue(0.95);

    const agent = new VendorJourneyAgent({
      vendor: capacityConstrainedVendor,
      runId: 'run_test_02',
      prng,
      environment: 'emulator',
    });

    const result = await agent.processOrder('sim_ord_200', '2026-11-09');

    expect(result.status).toBe('rejected');
    const updatedOrder = (db as any).__getDoc('orders/sim_ord_200');
    expect(updatedOrder.status).toBe('cancelled');
    expect(updatedOrder.cancellationReason).toBe('vendor_rejected_capacity');

    expect(EventLedger.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'synthetic_order_rejected',
        payload: expect.objectContaining({ rejectionReason: 'capacity_exceeded' }),
      })
    );
  });
});
