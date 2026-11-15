/**
 * Versioned Behavior Profiles for MAE.
 * Dictates probability distributions for customer and vendor simulated journeys.
 */

import type { CustomerProfileId, VendorProfileId } from '../population/types';

export interface CustomerBehaviorProfile {
  profileId: CustomerProfileId;
  version: number;
  description: string;
  targetWeeklyFrequency: number; // Planned weekly returns
  cartAbandonmentProbability: number; // Probability [0, 1] of abandoning cart before checkout
  paymentFailureProbability: number; // Probability [0, 1] of payment gateway decline
  itemsPerOrderMean: number;
  preferredCategories: string[];
}

export interface VendorBehaviorProfile {
  profileId: VendorProfileId;
  version: number;
  description: string;
  acceptanceProbability: number; // Probability [0, 1] of accepting an assigned order
  rejectionProbability: number; // Probability [0, 1] of rejecting order (e.g. stockout)
  acceptanceDelayMinutesRange: [number, number]; // [min, max] delay to accept
  fulfillmentDelayMinutesRange: [number, number]; // [min, max] delay to fulfill
  fulfillmentFailureRate: number;
}

export const CUSTOMER_PROFILES: Record<CustomerProfileId, CustomerBehaviorProfile> = {
  regular_shopper_v1: {
    profileId: 'regular_shopper_v1',
    version: 1,
    description: 'Returns 2-3 times per week, moderate cart abandonment',
    targetWeeklyFrequency: 3,
    cartAbandonmentProbability: 0.20,
    paymentFailureProbability: 0.05,
    itemsPerOrderMean: 2,
    preferredCategories: ['electronics', 'fashion', 'groceries'],
  },
  occasional_shopper_v1: {
    profileId: 'occasional_shopper_v1',
    version: 1,
    description: 'Returns once per week or fortnightly',
    targetWeeklyFrequency: 1,
    cartAbandonmentProbability: 0.35,
    paymentFailureProbability: 0.05,
    itemsPerOrderMean: 1.5,
    preferredCategories: ['home', 'electronics'],
  },
  frequent_shopper_v1: {
    profileId: 'frequent_shopper_v1',
    version: 1,
    description: 'Active 4-5 times per week with high conversion rate',
    targetWeeklyFrequency: 5,
    cartAbandonmentProbability: 0.10,
    paymentFailureProbability: 0.02,
    itemsPerOrderMean: 3,
    preferredCategories: ['groceries', 'beauty', 'fashion'],
  },
  window_shopper_v1: {
    profileId: 'window_shopper_v1',
    version: 1,
    description: 'Frequently browses and adds to cart but almost always abandons',
    targetWeeklyFrequency: 4,
    cartAbandonmentProbability: 0.85,
    paymentFailureProbability: 0.10,
    itemsPerOrderMean: 1,
    preferredCategories: ['electronics', 'sports'],
  },
  impulsive_buyer_v1: {
    profileId: 'impulsive_buyer_v1',
    version: 1,
    description: 'High purchase rate on discovered items with zero cart abandonment',
    targetWeeklyFrequency: 2,
    cartAbandonmentProbability: 0.05,
    paymentFailureProbability: 0.02,
    itemsPerOrderMean: 2.5,
    preferredCategories: ['fashion', 'beauty'],
  },
};

export const VENDOR_PROFILES: Record<VendorProfileId, VendorBehaviorProfile> = {
  fast_fulfiller_v1: {
    profileId: 'fast_fulfiller_v1',
    version: 1,
    description: 'Accepts orders promptly within 15-30 minutes, fulfills within SLA',
    acceptanceProbability: 0.98,
    rejectionProbability: 0.02,
    acceptanceDelayMinutesRange: [5, 30],
    fulfillmentDelayMinutesRange: [30, 180],
    fulfillmentFailureRate: 0.01,
  },
  standard_fulfiller_v1: {
    profileId: 'standard_fulfiller_v1',
    version: 1,
    description: 'Processes orders within standard SLA windows (2-12 hours)',
    acceptanceProbability: 0.92,
    rejectionProbability: 0.08,
    acceptanceDelayMinutesRange: [60, 360],
    fulfillmentDelayMinutesRange: [360, 1440],
    fulfillmentFailureRate: 0.03,
  },
  delayed_fulfiller_v1: {
    profileId: 'delayed_fulfiller_v1',
    version: 1,
    description: 'Slow to accept and fulfill; tests system SLA warning boundaries',
    acceptanceProbability: 0.80,
    rejectionProbability: 0.15,
    acceptanceDelayMinutesRange: [300, 720],
    fulfillmentDelayMinutesRange: [1440, 2880],
    fulfillmentFailureRate: 0.05,
  },
  capacity_constrained_v1: {
    profileId: 'capacity_constrained_v1',
    version: 1,
    description: 'Rejects 25% of orders due to inventory/capacity limits',
    acceptanceProbability: 0.75,
    rejectionProbability: 0.25,
    acceptanceDelayMinutesRange: [60, 180],
    fulfillmentDelayMinutesRange: [180, 720],
    fulfillmentFailureRate: 0.04,
  },
};
