/**
 * Activity Orchestrator for Marketplace Activity Engine (MAE).
 *
 * Coordinates end-to-end execution of scheduled marketplace simulations:
 * 1. Acquires distributed scheduler lock.
 * 2. Enforces fail-closed environment isolation.
 * 3. Seeds persistent population if missing.
 * 4. Resolves daily schedule deterministically.
 * 5. Executes customer journeys (discovery -> checkout).
 * 6. Executes vendor fulfillment workflows.
 * 7. Releases lock and returns structured execution report.
 */

import { assertStrictIsolation, VerifiedExecutionContext } from '../safety/environment-guard';
import { SchedulerLockManager } from './scheduler-lock';
import { CustomerRegistry } from '../population/customer-registry';
import { VendorRegistry } from '../population/vendor-registry';
import { PopulationSeeder } from '../population/population-seeder';
import { ScheduleResolver } from './schedule-resolver';
import { CustomerJourneyAgent, CatalogItemPreview } from '../journeys/customer-journey';
import { VendorJourneyAgent } from '../journeys/vendor-journey';
import { firestoreAdmin as db } from '@/lib/firebase-admin';

import { processOutboxBatch } from '@/lib/analytics-worker';

export interface OrchestratorRunOptions {
  dateStr?: string;
  runId?: string;
  customerLimit?: number;
  vendorLimit?: number;
  runSalt?: string;
}

export interface OrchestratorRunReport {
  runId: string;
  dateStr: string;
  environment: 'simulation' | 'emulator';
  fencingToken: number;
  stats: {
    plannedCustomers: number;
    executedCustomers: number;
    completedOrders: number;
    abandonedCarts: number;
    paymentFailures: number;
    stockoutAbandons: number;
    plannedVendors: number;
    fulfilledOrders: number;
    rejectedOrders: number;
  };
  durationMs: number;
  status: 'COMPLETED' | 'FAILED';
}

export class ActivityOrchestrator {
  /**
   * Runs the complete scheduled simulation cycle.
   */
  static async run(options: OrchestratorRunOptions = {}): Promise<OrchestratorRunReport> {
    const startTime = Date.now();
    const dateStr = options.dateStr || new Date().toISOString().slice(0, 10);
    const runId = options.runId || `run_${dateStr}_${Date.now()}`;

    // 1. Enforce Fail-Closed Isolation Guard FIRST
    const envContext: VerifiedExecutionContext = assertStrictIsolation();

    // 2. Acquire Distributed Scheduler Lock
    const lock = await SchedulerLockManager.acquireLock(runId);

    try {
      // 3. Ensure Population is Provisioned
      await PopulationSeeder.seedPopulationIfMissing();

      // 4. Load Populations
      const customers = await CustomerRegistry.listCustomers();
      const vendors = await VendorRegistry.listVendors();

      // 5. Resolve Schedule
      const schedule = ScheduleResolver.resolve({
        dateStr,
        runSalt: options.runSalt,
        customers,
        vendors,
        overrideCustomerLimit: options.customerLimit,
        overrideVendorLimit: options.vendorLimit,
      });

      // 6. Load Catalog for Simulation
      const catalogSnap = await db.collection('products').limit(30).get();
      let catalog: CatalogItemPreview[] = [];

      if (!catalogSnap.empty) {
        catalog = catalogSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Sim Product',
            price: Number(data.price || 1000),
            vendorId: data.vendorId || schedule.selectedVendors[0]?.syntheticId || 'vend_sim_0001',
            stock: Number(data.stock ?? 10),
            category: data.category || 'electronics',
          };
        });
      } else {
        // Fallback default simulation catalog
        catalog = [
          { id: 'prod_sim_01', name: 'Sim Laptop Pro', price: 45000, vendorId: 'vend_sim_0001', stock: 15 },
          { id: 'prod_sim_02', name: 'Sim Smart TV 55"', price: 38000, vendorId: 'vend_sim_0002', stock: 8 },
          { id: 'prod_sim_03', name: 'Sim Wireless Earbuds', price: 2500, vendorId: 'vend_sim_0001', stock: 25 },
        ];
      }

      const report: OrchestratorRunReport = {
        runId,
        dateStr,
        environment: envContext.environment,
        fencingToken: lock.fencingToken,
        stats: {
          plannedCustomers: schedule.selectedCustomers.length,
          executedCustomers: 0,
          completedOrders: 0,
          abandonedCarts: 0,
          paymentFailures: 0,
          stockoutAbandons: 0,
          plannedVendors: schedule.selectedVendors.length,
          fulfilledOrders: 0,
          rejectedOrders: 0,
        },
        durationMs: 0,
        status: 'COMPLETED',
      };

      const placedOrderIds: string[] = [];

      // 7. Execute Customer Shopping Journeys
      for (const customer of schedule.selectedCustomers) {
        const journeyId = `jny_${customer.syntheticId}_${Date.now()}`;
        const journeyPRNG = ScheduleResolver.createJourneyPRNG(runId, customer.syntheticId);

        const agent = new CustomerJourneyAgent({
          customer,
          runId,
          journeyId,
          prng: journeyPRNG,
          environment: envContext.environment,
        });

        const journeyResult = await agent.execute(catalog, dateStr);
        report.stats.executedCustomers++;

        if (journeyResult.status === 'completed_order' && journeyResult.orderId) {
          report.stats.completedOrders++;
          placedOrderIds.push(journeyResult.orderId);
        } else if (journeyResult.status === 'abandoned_cart') {
          report.stats.abandonedCarts++;
        } else if (journeyResult.status === 'payment_failed') {
          report.stats.paymentFailures++;
        } else if (journeyResult.status === 'stockout_abandoned') {
          report.stats.stockoutAbandons++;
        }
      }

      // 8. Execute Vendor Fulfillment Workflows for Placed Orders
      for (let i = 0; i < placedOrderIds.length; i++) {
        const orderId = placedOrderIds[i];
        const assignedVendor = schedule.selectedVendors[i % schedule.selectedVendors.length];
        if (assignedVendor) {
          const vendorPRNG = ScheduleResolver.createJourneyPRNG(runId, assignedVendor.syntheticId);
          const vendorAgent = new VendorJourneyAgent({
            vendor: assignedVendor,
            runId,
            prng: vendorPRNG,
            environment: envContext.environment,
          });

          const vendResult = await vendorAgent.processOrder(orderId, dateStr);
          if (vendResult.status === 'accepted_and_fulfilled') {
            report.stats.fulfilledOrders++;
          } else {
            report.stats.rejectedOrders++;
          }
        }
      }

      // 9. Dispatch and Reconcile Outbox Events via Supervised Worker
      try {
        await processOutboxBatch({ batchSize: 50, workerId: `sim_worker_${runId}` });
      } catch (err: any) {
        console.warn('[ActivityOrchestrator] Warning: Outbox batch drain encountered non-fatal error:', err?.message || err);
      }

      report.durationMs = Date.now() - startTime;
      return report;
    } finally {
      // 10. Guarantee Lock Release
      await SchedulerLockManager.releaseLock(runId);
    }
  }
}
