/**
 * Persistent Synthetic Identity Types for MAE.
 */

export type CustomerProfileId =
  | 'regular_shopper_v1'
  | 'occasional_shopper_v1'
  | 'frequent_shopper_v1'
  | 'window_shopper_v1'
  | 'impulsive_buyer_v1';

export type VendorProfileId =
  | 'fast_fulfiller_v1'
  | 'standard_fulfiller_v1'
  | 'delayed_fulfiller_v1'
  | 'capacity_constrained_v1';

export interface SyntheticCustomerAccount {
  syntheticId: string; // e.g. "cust_sim_0001"
  authUid: string;
  email: string; // e.g. "cust.sim.0001@sim.zilacart.ke"
  synthetic: true;
  profileId: CustomerProfileId;
  cohortDate: string; // ISO Date YYYY-MM-DD
  lifecycleState: 'active' | 'cooling_down' | 'churned' | 'suspended';
  stats: {
    totalJourneysStarted: number;
    totalOrdersPlaced: number;
    lastActiveDate: string;
    repeatPurchaseCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SyntheticVendorAccount {
  syntheticId: string; // e.g. "vend_sim_0001"
  authUid: string;
  storeName: string;
  synthetic: true;
  profileId: VendorProfileId;
  catalogProductIds: string[];
  cohortDate: string; // ISO Date YYYY-MM-DD
  lifecycleState: 'active' | 'on_vacation' | 'inactive';
  stats: {
    ordersReceived: number;
    ordersAccepted: number;
    ordersFulfilled: number;
    ordersRejected: number;
    averageAcceptanceDelayMs: number;
    lastActiveDate: string;
  };
  createdAt: string;
  updatedAt: string;
}
