import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerJourneyAgent, CatalogItemPreview } from '@/marketplace-activity-engine/journeys/customer-journey';
import { SeededPRNG } from '@/marketplace-activity-engine/orchestrator/schedule-resolver';
import { EventLedger } from '@/marketplace-activity-engine/ledger/event-ledger';
import { CustomerRegistry } from '@/marketplace-activity-engine/population/customer-registry';
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
      runTransaction: async (fn: any) => {
        const transaction = {
          get: vi.fn(async (ref: any) => ref.get()),
          set: vi.fn((ref: any, data: any) => ref.set(data)),
          update: vi.fn((ref: any, data: any) => ref.update(data)),
        };
        return fn(transaction);
      },
      __resetMockStore: () => {
        mockStore = {};
      },
    },
  };
});

vi.mock('@/lib/analytics-outbox', () => ({
  confirmOrderAndRecordPurchaseTransaction: vi.fn(async () => ({
    confirmed: true,
    outboxId: 'outbox_test',
    replayed: false,
  })),
}));

describe('CustomerJourneyAgent', () => {
  beforeEach(() => {
    (db as any).__resetMockStore();
    vi.spyOn(EventLedger, 'recordEvent').mockImplementation(async () => {});
    vi.spyOn(CustomerRegistry, 'recordCustomerActivity').mockImplementation(async () => {});
  });

  const mockCustomer: any = {
    syntheticId: 'cust_sim_0001',
    authUid: 'auth_cust_0001',
    email: 'cust.sim.0001@sim.zilacart.ke',
    synthetic: true,
    profileId: 'impulsive_buyer_v1', // Low abandonment, low failure
    cohortDate: '2026-09-01',
    lifecycleState: 'active',
    stats: { totalJourneysStarted: 0, totalOrdersPlaced: 0, lastActiveDate: '', repeatPurchaseCount: 0 },
  };

  it('completes order successfully for converting customer', async () => {
    // Seed PRNG where all rolls stay under thresholds
    const prng = new SeededPRNG(42);
    const catalog: CatalogItemPreview[] = [
      { id: 'prod_01', name: 'Wireless Headphones', price: 3500, vendorId: 'vend_01', stock: 10 },
    ];

    const agent = new CustomerJourneyAgent({
      customer: mockCustomer,
      runId: 'run_test_01',
      journeyId: 'jny_test_01',
      prng,
      environment: 'emulator',
    });

    const result = await agent.execute(catalog, '2026-11-09');

    expect(result.status).toBe('completed_order');
    expect(result.orderId).toBe('sim_ord_jny_test_01');
    expect(result.totalAmount).toBe(3500);

    expect(EventLedger.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'synthetic_order_placed' })
    );
    expect(CustomerRegistry.recordCustomerActivity).toHaveBeenCalledWith(
      expect.objectContaining({ orderPlaced: true })
    );
  });

  it('handles targeted inventory depletion (stockout scenario)', async () => {
    const prng = new SeededPRNG(42);
    const zeroStockCatalog: CatalogItemPreview[] = [
      { id: 'prod_sold_out', name: 'Out of Stock Laptop', price: 85000, vendorId: 'vend_01', stock: 0 },
    ];

    const agent = new CustomerJourneyAgent({
      customer: mockCustomer,
      runId: 'run_test_stockout',
      journeyId: 'jny_test_stockout',
      prng,
      environment: 'emulator',
    });

    const result = await agent.execute(zeroStockCatalog, '2026-11-09');

    expect(result.status).toBe('stockout_abandoned');
    expect(EventLedger.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'synthetic_cart_abandon',
        payload: expect.objectContaining({ reason: 'item_stockout' }),
      })
    );
  });

  it('triggers cart abandonment when behavior profile dictates', async () => {
    const windowShopperCustomer: any = {
      ...mockCustomer,
      profileId: 'window_shopper_v1', // 85% abandonment probability
    };

    // Use PRNG where abandonment roll is triggered
    const prng = new SeededPRNG(1);
    // Ensure the abandonment check roll (which happens after promotion rolls) returns < 0.85
    vi.spyOn(prng, 'next').mockReturnValue(0.1);
    const catalog: CatalogItemPreview[] = [
      { id: 'prod_01', name: 'Shoes', price: 4000, vendorId: 'vend_01', stock: 5 },
    ];

    const agent = new CustomerJourneyAgent({
      customer: windowShopperCustomer,
      runId: 'run_test_abandon',
      journeyId: 'jny_test_abandon',
      prng,
      environment: 'emulator',
    });

    const result = await agent.execute(catalog, '2026-11-09');
    expect(result.status).toBe('abandoned_cart');
    expect(EventLedger.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'synthetic_cart_abandon',
        payload: expect.objectContaining({ reason: 'profile_abandonment' }),
      })
    );
  });
});
