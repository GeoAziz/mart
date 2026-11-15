import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityOrchestrator } from '@/marketplace-activity-engine/orchestrator/activity-orchestrator';
import { SchedulerLockManager } from '@/marketplace-activity-engine/orchestrator/scheduler-lock';
import { PopulationSeeder } from '@/marketplace-activity-engine/population/population-seeder';
import { CustomerRegistry } from '@/marketplace-activity-engine/population/customer-registry';
import { VendorRegistry } from '@/marketplace-activity-engine/population/vendor-registry';
import { CustomerJourneyAgent } from '@/marketplace-activity-engine/journeys/customer-journey';
import { VendorJourneyAgent } from '@/marketplace-activity-engine/journeys/vendor-journey';
import * as EnvGuard from '@/marketplace-activity-engine/safety/environment-guard';
import { firestoreAdmin as db } from '@/lib/firebase-admin';

vi.mock('@/lib/firebase-admin', () => ({
  firestoreAdmin: {
    collection: () => ({
      limit: () => ({
        get: vi.fn(async () => ({ empty: true, docs: [] })),
      }),
    }),
  },
}));

describe('ActivityOrchestrator', () => {
  beforeEach(() => {
    vi.spyOn(EnvGuard, 'assertStrictIsolation').mockReturnValue({
      environment: 'emulator',
      provenance: 'synthetic',
      projectId: 'demo-zilacart',
      runId: 'run_test_orch',
      fencingToken: 1,
    });

    vi.spyOn(SchedulerLockManager, 'acquireLock').mockResolvedValue({
      acquired: true,
      fencingToken: 1,
    });
    vi.spyOn(SchedulerLockManager, 'releaseLock').mockResolvedValue();

    vi.spyOn(PopulationSeeder, 'seedPopulationIfMissing').mockResolvedValue({
      customersSeeded: 0,
      vendorsSeeded: 0,
    });

    vi.spyOn(CustomerRegistry, 'listCustomers').mockResolvedValue([
      {
        syntheticId: 'cust_sim_0001',
        authUid: 'auth_01',
        email: 'c1@sim.zilacart.ke',
        synthetic: true,
        profileId: 'regular_shopper_v1',
        cohortDate: '2026-09-01',
        lifecycleState: 'active',
        stats: { totalJourneysStarted: 0, totalOrdersPlaced: 0, lastActiveDate: '', repeatPurchaseCount: 0 },
        createdAt: '',
        updatedAt: '',
      },
    ]);

    vi.spyOn(VendorRegistry, 'listVendors').mockResolvedValue([
      {
        syntheticId: 'vend_sim_0001',
        authUid: 'auth_v1',
        storeName: 'Sim Store',
        synthetic: true,
        profileId: 'fast_fulfiller_v1',
        catalogProductIds: [],
        cohortDate: '2026-09-01',
        lifecycleState: 'active',
        stats: { ordersReceived: 0, ordersAccepted: 0, ordersFulfilled: 0, ordersRejected: 0, averageAcceptanceDelayMs: 0, lastActiveDate: '' },
        createdAt: '',
        updatedAt: '',
      },
    ]);

    vi.spyOn(CustomerJourneyAgent.prototype, 'execute').mockResolvedValue({
      journeyId: 'jny_01',
      customerId: 'cust_sim_0001',
      status: 'completed_order',
      orderId: 'sim_ord_999',
      totalAmount: 4500,
    });

    vi.spyOn(VendorJourneyAgent.prototype, 'processOrder').mockResolvedValue({
      vendorId: 'vend_sim_0001',
      orderId: 'sim_ord_999',
      status: 'accepted_and_fulfilled',
      withinSLA: true,
    });
  });

  it('runs an orchestrated simulation cycle and produces a structured report', async () => {
    const report = await ActivityOrchestrator.run({
      dateStr: '2026-11-09',
      customerLimit: 1,
      vendorLimit: 1,
    });

    expect(report.status).toBe('COMPLETED');
    expect(report.stats.executedCustomers).toBe(1);
    expect(report.stats.completedOrders).toBe(1);
    expect(report.stats.fulfilledOrders).toBe(1);
    expect(SchedulerLockManager.acquireLock).toHaveBeenCalled();
    expect(SchedulerLockManager.releaseLock).toHaveBeenCalled();
  });

  it('guarantees lock release even when an error occurs during execution', async () => {
    vi.spyOn(CustomerJourneyAgent.prototype, 'execute').mockRejectedValueOnce(
      new Error('Simulated network fault')
    );

    await expect(ActivityOrchestrator.run({ dateStr: '2026-11-09' })).rejects.toThrow(
      'Simulated network fault'
    );

    expect(SchedulerLockManager.releaseLock).toHaveBeenCalled();
  });
});
