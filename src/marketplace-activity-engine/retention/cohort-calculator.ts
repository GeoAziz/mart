/**
 * First-Party Retention Cohort Calculator for MAE.
 *
 * Computes exact-day and rolling-window retention matrices for customers and vendors.
 * Strictly operates in Africa/Nairobi timezone boundaries with explicit environment declaration.
 */

import { toNairobiDateString, getCalendarDayDiff } from './timezone-utils';

export type RetentionInterval = 'D1' | 'D7' | 'D14' | 'D30' | 'D90';

export interface RetentionMetricCell {
  interval: RetentionInterval;
  activeCount: number;
  cohortSize: number;
  rate: number; // [0, 1]
  percentage: string; // "XX.X%"
  label: string; // "XX.X% (n=YY)"
}

export interface RollingRetentionMetricCell {
  window: 'rolling_D1_D7' | 'rolling_D1_D14' | 'rolling_D1_D30' | 'rolling_D1_D90';
  activeCount: number;
  cohortSize: number;
  rate: number;
  percentage: string;
  label: string;
}

export interface CustomerCohortResult {
  cohortDate: string; // YYYY-MM-DD (Africa/Nairobi)
  cohortSize: number;
  loginBased: {
    exactDay: Record<RetentionInterval, RetentionMetricCell>;
    rolling: Record<string, RollingRetentionMetricCell>;
  };
  purchaseBased: {
    exactDay: Record<RetentionInterval, RetentionMetricCell>;
    rolling: Record<string, RollingRetentionMetricCell>;
  };
}

export interface UserActivityRecord {
  userId: string;
  timestamp: string | Date; // UTC
  type: 'auth_session_start' | 'purchase';
}

export class CohortCalculator {
  /**
   * Computes customer retention metrics for a specific cohort date.
   * Throws if environment is not explicitly supplied.
   */
  static calculateCustomerCohort(params: {
    environment: 'production' | 'simulation';
    cohortDateStr: string; // YYYY-MM-DD in Africa/Nairobi
    cohortUserIds: string[];
    activityStream: UserActivityRecord[];
  }): CustomerCohortResult {
    if (!params.environment || (params.environment !== 'production' && params.environment !== 'simulation')) {
      throw new Error(`[CohortCalculator] Explicit environment ('production' | 'simulation') must be provided.`);
    }

    const { cohortDateStr, cohortUserIds, activityStream } = params;
    const cohortSet = new Set(cohortUserIds);
    const cohortSize = cohortUserIds.length;

    // Filter events belonging to users in this cohort
    const cohortEvents = activityStream.filter((ev) => cohortSet.has(ev.userId));

    // Map each user to the set of days they were active (day offset N relative to cohortDateStr)
    const userLoginDaysMap = new Map<string, Set<number>>();
    const userPurchaseDaysMap = new Map<string, Set<number>>();

    for (const uid of cohortUserIds) {
      userLoginDaysMap.set(uid, new Set());
      userPurchaseDaysMap.set(uid, new Set());
    }

    for (const ev of cohortEvents) {
      const eventDateStr = toNairobiDateString(ev.timestamp);
      const dayOffset = getCalendarDayDiff(cohortDateStr, eventDateStr);

      if (dayOffset >= 0) {
        if (ev.type === 'auth_session_start') {
          userLoginDaysMap.get(ev.userId)?.add(dayOffset);
        } else if (ev.type === 'purchase') {
          userPurchaseDaysMap.get(ev.userId)?.add(dayOffset);
        }
      }
    }

    // Helper to calculate cell
    const computeExactCell = (
      userDaysMap: Map<string, Set<number>>,
      targetDay: number,
      interval: RetentionInterval
    ): RetentionMetricCell => {
      let active = 0;
      if (cohortSize > 0) {
        for (const days of userDaysMap.values()) {
          if (days.has(targetDay)) active++;
        }
      }
      const rate = cohortSize > 0 ? active / cohortSize : 0;
      const percentage = `${(rate * 100).toFixed(1)}%`;
      return {
        interval,
        activeCount: active,
        cohortSize,
        rate: Number(rate.toFixed(4)),
        percentage,
        label: `${percentage} (n=${cohortSize})`,
      };
    };

    // Helper for rolling retention
    const computeRollingCell = (
      userDaysMap: Map<string, Set<number>>,
      maxDay: number,
      window: RollingRetentionMetricCell['window']
    ): RollingRetentionMetricCell => {
      let active = 0;
      if (cohortSize > 0) {
        for (const days of userDaysMap.values()) {
          // Active at least once between day 1 and maxDay
          let found = false;
          for (let d = 1; d <= maxDay; d++) {
            if (days.has(d)) {
              found = true;
              break;
            }
          }
          if (found) active++;
        }
      }
      const rate = cohortSize > 0 ? active / cohortSize : 0;
      const percentage = `${(rate * 100).toFixed(1)}%`;
      return {
        window,
        activeCount: active,
        cohortSize,
        rate: Number(rate.toFixed(4)),
        percentage,
        label: `${percentage} (n=${cohortSize})`,
      };
    };

    return {
      cohortDate: cohortDateStr,
      cohortSize,
      loginBased: {
        exactDay: {
          D1: computeExactCell(userLoginDaysMap, 1, 'D1'),
          D7: computeExactCell(userLoginDaysMap, 7, 'D7'),
          D14: computeExactCell(userLoginDaysMap, 14, 'D14'),
          D30: computeExactCell(userLoginDaysMap, 30, 'D30'),
          D90: computeExactCell(userLoginDaysMap, 90, 'D90'),
        },
        rolling: {
          rolling_D1_D7: computeRollingCell(userLoginDaysMap, 7, 'rolling_D1_D7'),
          rolling_D1_D14: computeRollingCell(userLoginDaysMap, 14, 'rolling_D1_D14'),
          rolling_D1_D30: computeRollingCell(userLoginDaysMap, 30, 'rolling_D1_D30'),
          rolling_D1_D90: computeRollingCell(userLoginDaysMap, 90, 'rolling_D1_D90'),
        },
      },
      purchaseBased: {
        exactDay: {
          D1: computeExactCell(userPurchaseDaysMap, 1, 'D1'),
          D7: computeExactCell(userPurchaseDaysMap, 7, 'D7'),
          D14: computeExactCell(userPurchaseDaysMap, 14, 'D14'),
          D30: computeExactCell(userPurchaseDaysMap, 30, 'D30'),
          D90: computeExactCell(userPurchaseDaysMap, 90, 'D90'),
        },
        rolling: {
          rolling_D1_D7: computeRollingCell(userPurchaseDaysMap, 7, 'rolling_D1_D7'),
          rolling_D1_D14: computeRollingCell(userPurchaseDaysMap, 14, 'rolling_D1_D14'),
          rolling_D1_D30: computeRollingCell(userPurchaseDaysMap, 30, 'rolling_D1_D30'),
          rolling_D1_D90: computeRollingCell(userPurchaseDaysMap, 90, 'rolling_D1_D90'),
        },
      },
    };
  }
}
