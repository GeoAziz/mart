import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerRegistry } from '@/marketplace-activity-engine/population/customer-registry';
import { VendorRegistry } from '@/marketplace-activity-engine/population/vendor-registry';
import { PopulationSeeder } from '@/marketplace-activity-engine/population/population-seeder';
import { firestoreAdmin as db } from '@/lib/firebase-admin';

vi.mock('@/lib/firebase-admin', () => {
  let mockCollections: Record<string, Record<string, any>> = {};

  return {
    firestoreAdmin: {
      collection: (col: string) => ({
        doc: (d1: string) => ({
          collection: (subCol: string) => {
            const tableKey = `${col}/${d1}/${subCol}`;
            return {
              doc: (docId: string) => ({
                get: vi.fn(async () => ({
                  exists: Boolean(mockCollections[tableKey]?.[docId]),
                  data: () => mockCollections[tableKey]?.[docId],
                })),
                set: vi.fn(async (data: any, options?: any) => {
                  if (!mockCollections[tableKey]) mockCollections[tableKey] = {};
                  if (options?.merge && mockCollections[tableKey][docId]) {
                    mockCollections[tableKey][docId] = { ...mockCollections[tableKey][docId], ...data };
                  } else {
                    mockCollections[tableKey][docId] = { ...data };
                  }
                }),
              }),
              get: vi.fn(async () => {
                const docs = Object.values(mockCollections[tableKey] || {}).map((item) => ({
                  data: () => item,
                }));
                return { docs };
              }),
            };
          },
        }),
      }),
      runTransaction: async (fn: any) => {
        const transaction = {
          get: vi.fn(async (ref: any) => ref.get()),
          update: vi.fn(async (ref: any, data: any) => ref.set(data, { merge: true })),
        };
        return fn(transaction);
      },
      __resetMockCollections: () => {
        mockCollections = {};
      },
    },
  };
});

describe('Population Registries & Seeder', () => {
  beforeEach(() => {
    (db as any).__resetMockCollections();
  });

  it('seeds population deterministically when empty', async () => {
    const result = await PopulationSeeder.seedPopulationIfMissing();
    expect(result.customersSeeded).toBe(10);
    expect(result.vendorsSeeded).toBe(5);

    const customers = await CustomerRegistry.listCustomers();
    expect(customers.length).toBe(10);
    expect(customers[0].synthetic).toBe(true);

    const vendors = await VendorRegistry.listVendors();
    expect(vendors.length).toBe(5);
  });

  it('does not re-seed existing accounts on subsequent runs', async () => {
    await PopulationSeeder.seedPopulationIfMissing();
    const secondRun = await PopulationSeeder.seedPopulationIfMissing();
    expect(secondRun.customersSeeded).toBe(0);
    expect(secondRun.vendorsSeeded).toBe(0);
  });

  it('updates customer activity and tracks repeat purchases', async () => {
    await PopulationSeeder.seedPopulationIfMissing();

    await CustomerRegistry.recordCustomerActivity({
      syntheticId: 'cust_sim_0001',
      dateStr: '2026-10-01',
      orderPlaced: true,
    });

    let cust = await CustomerRegistry.getCustomer('cust_sim_0001');
    expect(cust?.stats.totalJourneysStarted).toBe(1);
    expect(cust?.stats.totalOrdersPlaced).toBe(1);
    expect(cust?.stats.repeatPurchaseCount).toBe(0);

    // Second purchase -> repeat purchase count increments
    await CustomerRegistry.recordCustomerActivity({
      syntheticId: 'cust_sim_0001',
      dateStr: '2026-10-08',
      orderPlaced: true,
    });

    cust = await CustomerRegistry.getCustomer('cust_sim_0001');
    expect(cust?.stats.totalJourneysStarted).toBe(2);
    expect(cust?.stats.totalOrdersPlaced).toBe(2);
    expect(cust?.stats.repeatPurchaseCount).toBe(1);
  });

  it('updates vendor activity and calculates average acceptance delay', async () => {
    await PopulationSeeder.seedPopulationIfMissing();

    await VendorRegistry.recordVendorActivity({
      syntheticId: 'vend_sim_0001',
      action: 'received',
      dateStr: '2026-10-01',
    });

    await VendorRegistry.recordVendorActivity({
      syntheticId: 'vend_sim_0001',
      action: 'accepted',
      delayMs: 60000,
      dateStr: '2026-10-01',
    });

    let vend = await VendorRegistry.getVendor('vend_sim_0001');
    expect(vend?.stats.ordersReceived).toBe(1);
    expect(vend?.stats.ordersAccepted).toBe(1);
    expect(vend?.stats.averageAcceptanceDelayMs).toBe(60000);

    await VendorRegistry.recordVendorActivity({
      syntheticId: 'vend_sim_0001',
      action: 'fulfilled',
      dateStr: '2026-10-01',
    });

    vend = await VendorRegistry.getVendor('vend_sim_0001');
    expect(vend?.stats.ordersFulfilled).toBe(1);
  });
});
