import { describe, it, expect } from 'vitest';
import { ScheduleResolver, hashStringToSeed, SeededPRNG } from '@/marketplace-activity-engine/orchestrator/schedule-resolver';
import type { SyntheticCustomerAccount, SyntheticVendorAccount } from '@/marketplace-activity-engine/population/types';

function createMockCustomer(id: string, profile: any, lastActive = ''): SyntheticCustomerAccount {
  return {
    syntheticId: id,
    authUid: `auth_${id}`,
    email: `${id}@sim.zilacart.ke`,
    synthetic: true,
    profileId: profile,
    cohortDate: '2026-09-01',
    lifecycleState: 'active',
    stats: {
      totalJourneysStarted: 0,
      totalOrdersPlaced: 0,
      lastActiveDate: lastActive,
      repeatPurchaseCount: 0,
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };
}

function createMockVendor(id: string, profile: any): SyntheticVendorAccount {
  return {
    syntheticId: id,
    authUid: `auth_${id}`,
    storeName: `Store ${id}`,
    synthetic: true,
    profileId: profile,
    catalogProductIds: ['p1', 'p2'],
    cohortDate: '2026-09-01',
    lifecycleState: 'active',
    stats: {
      ordersReceived: 0,
      ordersAccepted: 0,
      ordersFulfilled: 0,
      ordersRejected: 0,
      averageAcceptanceDelayMs: 0,
      lastActiveDate: '',
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };
}

describe('ScheduleResolver', () => {
  const mockCustomers = [
    createMockCustomer('cust_01', 'regular_shopper_v1'),
    createMockCustomer('cust_02', 'frequent_shopper_v1'),
    createMockCustomer('cust_03', 'occasional_shopper_v1'),
    createMockCustomer('cust_04', 'window_shopper_v1'),
    createMockCustomer('cust_05', 'impulsive_buyer_v1'),
  ];

  const mockVendors = [
    createMockVendor('vend_01', 'fast_fulfiller_v1'),
    createMockVendor('vend_02', 'standard_fulfiller_v1'),
    createMockVendor('vend_03', 'delayed_fulfiller_v1'),
  ];

  it('produces 100% identical account selection on consecutive runs with identical seed', () => {
    const res1 = ScheduleResolver.resolve({
      dateStr: '2026-11-09',
      runSalt: 'test_salt_alpha',
      customers: mockCustomers,
      vendors: mockVendors,
      overrideCustomerLimit: 3,
      overrideVendorLimit: 2,
    });

    const res2 = ScheduleResolver.resolve({
      dateStr: '2026-11-09',
      runSalt: 'test_salt_alpha',
      customers: mockCustomers,
      vendors: mockVendors,
      overrideCustomerLimit: 3,
      overrideVendorLimit: 2,
    });

    expect(res1.masterSeed).toBe(res2.masterSeed);
    expect(res1.selectedCustomers.map((c) => c.syntheticId)).toEqual(
      res2.selectedCustomers.map((c) => c.syntheticId)
    );
    expect(res1.selectedVendors.map((v) => v.syntheticId)).toEqual(
      res2.selectedVendors.map((v) => v.syntheticId)
    );
  });

  it('excludes accounts already active on the same date', () => {
    const customersWithActive = [
      createMockCustomer('cust_active_today', 'frequent_shopper_v1', '2026-11-09'),
      createMockCustomer('cust_idle', 'regular_shopper_v1', '2026-11-08'),
    ];

    const res = ScheduleResolver.resolve({
      dateStr: '2026-11-09',
      customers: customersWithActive,
      vendors: mockVendors,
      overrideCustomerLimit: 2,
    });

    const ids = res.selectedCustomers.map((c) => c.syntheticId);
    expect(ids).not.toContain('cust_active_today');
    expect(ids).toContain('cust_idle');
  });

  it('creates reproducible journey sub-PRNGs', () => {
    const prng1 = ScheduleResolver.createJourneyPRNG('run_01', 'cust_01');
    const prng2 = ScheduleResolver.createJourneyPRNG('run_01', 'cust_01');

    expect(prng1.next()).toBe(prng2.next());
    expect(prng1.nextInt(10, 50)).toBe(prng2.nextInt(10, 50));
  });
});
