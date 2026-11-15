/**
 * Deterministic Pseudo-Random Scheduler & PRNG for MAE.
 *
 * Guarantees that given the same reporting date and run salt, the exact same
 * customer and vendor participants and journey decisions are selected.
 */

import type { SyntheticCustomerAccount, SyntheticVendorAccount } from '../population/types';
import { CUSTOMER_PROFILES, VENDOR_PROFILES } from '../config/behaviour-profiles';

/**
 * 32-bit Mulberry32 PRNG. Fast, deterministic, and high-quality distribution.
 */
export class SeededPRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * Generates a pseudorandom float in [0, 1).
   */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a pseudorandom integer in [min, max] inclusive.
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Picks a random item from an array.
   */
  pick<T>(arr: T[]): T {
    const idx = Math.floor(this.next() * arr.length);
    return arr[idx];
  }
}

/**
 * Deterministically hashes a string to a 32-bit unsigned integer seed.
 */
export function hashStringToSeed(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface DailyQuotaConfig {
  customers: number;
  vendors: number;
}

// Default weekly activity schedule (0=Sun, 1=Mon, ..., 6=Sat)
export const DEFAULT_WEEKLY_SCHEDULE: Record<number, DailyQuotaConfig> = {
  0: { customers: 3, vendors: 3 }, // Sunday
  1: { customers: 5, vendors: 5 }, // Monday
  2: { customers: 7, vendors: 5 }, // Tuesday
  3: { customers: 4, vendors: 4 }, // Wednesday
  4: { customers: 8, vendors: 5 }, // Thursday
  5: { customers: 6, vendors: 5 }, // Friday
  6: { customers: 9, vendors: 5 }, // Saturday
};

export interface ResolvedSchedule {
  dateStr: string;
  dayOfWeek: number;
  masterSeed: number;
  selectedCustomers: SyntheticCustomerAccount[];
  selectedVendors: SyntheticVendorAccount[];
}

export class ScheduleResolver {
  /**
   * Resolves scheduled customer and vendor participants deterministically for a date.
   */
  static resolve(params: {
    dateStr: string; // YYYY-MM-DD
    runSalt?: string;
    customers: SyntheticCustomerAccount[];
    vendors: SyntheticVendorAccount[];
    weeklyQuota?: Record<number, DailyQuotaConfig>;
    overrideCustomerLimit?: number;
    overrideVendorLimit?: number;
  }): ResolvedSchedule {
    const {
      dateStr,
      runSalt = process.env.SIMULATION_RUN_SALT || 'default_salt_2026',
      customers,
      vendors,
      weeklyQuota = DEFAULT_WEEKLY_SCHEDULE,
      overrideCustomerLimit,
      overrideVendorLimit,
    } = params;

    const date = new Date(dateStr);
    const dayOfWeek = isNaN(date.getDay()) ? 1 : date.getDay();
    const quota = weeklyQuota[dayOfWeek] || { customers: 5, vendors: 5 };

    const targetCustomerCount = overrideCustomerLimit ?? quota.customers;
    const targetVendorCount = overrideVendorLimit ?? quota.vendors;

    const masterSeed = hashStringToSeed(`${dateStr}_${runSalt}`);
    const rng = new SeededPRNG(masterSeed);

    // Filter active accounts
    const activeCustomers = customers.filter(
      (c) => c.lifecycleState === 'active' && c.stats.lastActiveDate !== dateStr
    );
    const activeVendors = vendors.filter((v) => v.lifecycleState === 'active');

    // Score customers based on profile target weekly frequency and deterministic jitter
    const scoredCustomers = activeCustomers.map((c) => {
      const profile = CUSTOMER_PROFILES[c.profileId] || CUSTOMER_PROFILES.regular_shopper_v1;
      const weight = profile.targetWeeklyFrequency;
      const jitter = rng.next();
      return { customer: c, score: weight * 10 + jitter };
    });

    scoredCustomers.sort((a, b) => b.score - a.score);
    const selectedCustomers = scoredCustomers
      .slice(0, Math.min(targetCustomerCount, scoredCustomers.length))
      .map((s) => s.customer);

    // Shuffle and pick vendors
    const scoredVendors = activeVendors.map((v) => ({
      vendor: v,
      score: rng.next(),
    }));
    scoredVendors.sort((a, b) => b.score - a.score);
    const selectedVendors = scoredVendors
      .slice(0, Math.min(targetVendorCount, scoredVendors.length))
      .map((s) => s.vendor);

    return {
      dateStr,
      dayOfWeek,
      masterSeed,
      selectedCustomers,
      selectedVendors,
    };
  }

  /**
   * Creates a dedicated deterministic PRNG for a single journey execution.
   */
  static createJourneyPRNG(runId: string, actorId: string): SeededPRNG {
    const seed = hashStringToSeed(`${runId}_${actorId}`);
    return new SeededPRNG(seed);
  }
}
