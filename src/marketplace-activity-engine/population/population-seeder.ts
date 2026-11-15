/**
 * Population Seeder for MAE.
 * Deterministically provisions persistent synthetic customers & vendors.
 */

import { CustomerRegistry } from './customer-registry';
import { VendorRegistry } from './vendor-registry';
import type { SyntheticCustomerAccount, SyntheticVendorAccount, CustomerProfileId, VendorProfileId } from './types';

export const INITIAL_SYNTHETIC_CUSTOMERS: Array<{
  syntheticId: string;
  email: string;
  profileId: CustomerProfileId;
  cohortDate: string;
}> = [
  { syntheticId: 'cust_sim_0001', email: 'cust.sim.0001@sim.zilacart.ke', profileId: 'regular_shopper_v1', cohortDate: '2026-09-01' },
  { syntheticId: 'cust_sim_0002', email: 'cust.sim.0002@sim.zilacart.ke', profileId: 'regular_shopper_v1', cohortDate: '2026-09-01' },
  { syntheticId: 'cust_sim_0003', email: 'cust.sim.0003@sim.zilacart.ke', profileId: 'occasional_shopper_v1', cohortDate: '2026-09-01' },
  { syntheticId: 'cust_sim_0004', email: 'cust.sim.0004@sim.zilacart.ke', profileId: 'occasional_shopper_v1', cohortDate: '2026-09-01' },
  { syntheticId: 'cust_sim_0005', email: 'cust.sim.0005@sim.zilacart.ke', profileId: 'frequent_shopper_v1', cohortDate: '2026-09-01' },
  { syntheticId: 'cust_sim_0006', email: 'cust.sim.0006@sim.zilacart.ke', profileId: 'frequent_shopper_v1', cohortDate: '2026-09-08' },
  { syntheticId: 'cust_sim_0007', email: 'cust.sim.0007@sim.zilacart.ke', profileId: 'window_shopper_v1', cohortDate: '2026-09-08' },
  { syntheticId: 'cust_sim_0008', email: 'cust.sim.0008@sim.zilacart.ke', profileId: 'impulsive_buyer_v1', cohortDate: '2026-09-08' },
  { syntheticId: 'cust_sim_0009', email: 'cust.sim.0009@sim.zilacart.ke', profileId: 'regular_shopper_v1', cohortDate: '2026-09-15' },
  { syntheticId: 'cust_sim_0010', email: 'cust.sim.0010@sim.zilacart.ke', profileId: 'occasional_shopper_v1', cohortDate: '2026-09-15' },
];

export const INITIAL_SYNTHETIC_VENDORS: Array<{
  syntheticId: string;
  storeName: string;
  profileId: VendorProfileId;
  cohortDate: string;
  catalogProductIds: string[];
}> = [
  { syntheticId: 'vend_sim_0001', storeName: 'Sim Tech Electronics Nairobi', profileId: 'fast_fulfiller_v1', cohortDate: '2026-09-01', catalogProductIds: ['prod_sim_001', 'prod_sim_002'] },
  { syntheticId: 'vend_sim_0002', storeName: 'Sim Rift Audio & Sound', profileId: 'fast_fulfiller_v1', cohortDate: '2026-09-01', catalogProductIds: ['prod_sim_003', 'prod_sim_004'] },
  { syntheticId: 'vend_sim_0003', storeName: 'Sim Coastal Mobile Hub', profileId: 'standard_fulfiller_v1', cohortDate: '2026-09-08', catalogProductIds: ['prod_sim_005', 'prod_sim_006'] },
  { syntheticId: 'vend_sim_0004', storeName: 'Sim Western Gadgets Kisumu', profileId: 'delayed_fulfiller_v1', cohortDate: '2026-09-08', catalogProductIds: ['prod_sim_007'] },
  { syntheticId: 'vend_sim_0005', storeName: 'Sim Mount Kenya Digital', profileId: 'capacity_constrained_v1', cohortDate: '2026-09-15', catalogProductIds: ['prod_sim_008'] },
];

export class PopulationSeeder {
  /**
   * Seeds persistent synthetic customers & vendors if not already provisioned.
   */
  static async seedPopulationIfMissing(): Promise<{ customersSeeded: number; vendorsSeeded: number }> {
    const existingCustomers = await CustomerRegistry.listCustomers();
    const existingCustomerIds = new Set(existingCustomers.map((c) => c.syntheticId));
    let customersSeeded = 0;

    for (const spec of INITIAL_SYNTHETIC_CUSTOMERS) {
      if (!existingCustomerIds.has(spec.syntheticId)) {
        const now = new Date().toISOString();
        const account: SyntheticCustomerAccount = {
          syntheticId: spec.syntheticId,
          authUid: `auth_${spec.syntheticId}`,
          email: spec.email,
          synthetic: true,
          profileId: spec.profileId,
          cohortDate: spec.cohortDate,
          lifecycleState: 'active',
          stats: {
            totalJourneysStarted: 0,
            totalOrdersPlaced: 0,
            lastActiveDate: '',
            repeatPurchaseCount: 0,
          },
          createdAt: now,
          updatedAt: now,
        };
        await CustomerRegistry.saveCustomer(account);
        customersSeeded++;
      }
    }

    const existingVendors = await VendorRegistry.listVendors();
    const existingVendorIds = new Set(existingVendors.map((v) => v.syntheticId));
    let vendorsSeeded = 0;

    for (const spec of INITIAL_SYNTHETIC_VENDORS) {
      if (!existingVendorIds.has(spec.syntheticId)) {
        const now = new Date().toISOString();
        const account: SyntheticVendorAccount = {
          syntheticId: spec.syntheticId,
          authUid: `auth_${spec.syntheticId}`,
          storeName: spec.storeName,
          synthetic: true,
          profileId: spec.profileId,
          catalogProductIds: spec.catalogProductIds,
          cohortDate: spec.cohortDate,
          lifecycleState: 'active',
          stats: {
            ordersReceived: 0,
            ordersAccepted: 0,
            ordersFulfilled: 0,
            ordersRejected: 0,
            averageAcceptanceDelayMs: 0,
            lastActiveDate: '',
          },
          createdAt: now,
          updatedAt: now,
        };
        await VendorRegistry.saveVendor(account);
        vendorsSeeded++;
      }
    }

    return { customersSeeded, vendorsSeeded };
  }
}
