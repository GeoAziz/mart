import { describe, it, expect } from 'vitest';
import { CohortCalculator, UserActivityRecord } from '@/marketplace-activity-engine/retention/cohort-calculator';
import { VendorOpportunityModel, VendorOrderOpportunity } from '@/marketplace-activity-engine/retention/vendor-opportunity-model';
import { toNairobiDateString, getCalendarDayDiff } from '@/marketplace-activity-engine/retention/timezone-utils';

describe('Retention Intelligence - Known-Answer Tests (KAT)', () => {
  describe('Timezone & Boundary Verification (Africa/Nairobi)', () => {
    it('converts UTC evening timestamp across EAT midnight boundary', () => {
      // 21:30 UTC on 2026-10-01 is 00:30 EAT on 2026-10-02
      const utcTimestamp = '2026-10-01T21:30:00Z';
      const eatDate = toNairobiDateString(utcTimestamp);
      expect(eatDate).toBe('2026-10-02');
    });

    it('calculates calendar day differences accurately in EAT', () => {
      const diffD1 = getCalendarDayDiff('2026-10-01', '2026-10-02');
      expect(diffD1).toBe(1);

      const diffD7 = getCalendarDayDiff('2026-10-01', '2026-10-08');
      expect(diffD7).toBe(7);

      const diffD30 = getCalendarDayDiff('2026-10-01', '2026-10-31');
      expect(diffD30).toBe(30);
    });
  });

  describe('CohortCalculator Known-Answer Fixture Test', () => {
    it('throws if environment parameter is missing or invalid', () => {
      expect(() =>
        (CohortCalculator as any).calculateCustomerCohort({
          cohortDateStr: '2026-10-01',
          cohortUserIds: ['u1'],
          activityStream: [],
        })
      ).toThrow(/Explicit environment/);
    });

    it('reproduces exact known-answer customer cohort metrics with n-reported labels', () => {
      // Cohort of 100 users: u_001 to u_100
      const cohortUserIds = Array.from({ length: 100 }, (_, i) => `u_${String(i + 1).padStart(3, '0')}`);
      const cohortDateStr = '2026-10-01'; // Africa/Nairobi
      const activityStream: UserActivityRecord[] = [];

      // D1 Login: users 1 to 45 (45%)
      for (let i = 1; i <= 45; i++) {
        activityStream.push({
          userId: `u_${String(i).padStart(3, '0')}`,
          timestamp: '2026-10-02T10:00:00Z',
          type: 'auth_session_start',
        });
      }

      // D7 Login: users 1 to 28 (28%)
      for (let i = 1; i <= 28; i++) {
        activityStream.push({
          userId: `u_${String(i).padStart(3, '0')}`,
          timestamp: '2026-10-08T10:00:00Z',
          type: 'auth_session_start',
        });
      }

      // Users 46 to 62 active on D3 (enables rolling D1..D7 check to hit 62%)
      for (let i = 46; i <= 62; i++) {
        activityStream.push({
          userId: `u_${String(i).padStart(3, '0')}`,
          timestamp: '2026-10-04T10:00:00Z',
          type: 'auth_session_start',
        });
      }

      // D1 Purchase: users 1 to 12 (12%)
      for (let i = 1; i <= 12; i++) {
        activityStream.push({
          userId: `u_${String(i).padStart(3, '0')}`,
          timestamp: '2026-10-02T14:00:00Z',
          type: 'purchase',
        });
      }

      const result = CohortCalculator.calculateCustomerCohort({
        environment: 'simulation',
        cohortDateStr,
        cohortUserIds,
        activityStream,
      });

      // Login Based Exact Checks
      expect(result.loginBased.exactDay.D1.rate).toBe(0.45);
      expect(result.loginBased.exactDay.D1.percentage).toBe('45.0%');
      expect(result.loginBased.exactDay.D1.label).toBe('45.0% (n=100)');

      expect(result.loginBased.exactDay.D7.rate).toBe(0.28);
      expect(result.loginBased.exactDay.D7.percentage).toBe('28.0%');
      expect(result.loginBased.exactDay.D7.label).toBe('28.0% (n=100)');

      // Login Based Rolling D1..D7 Check
      expect(result.loginBased.rolling.rolling_D1_D7.rate).toBe(0.62);
      expect(result.loginBased.rolling.rolling_D1_D7.percentage).toBe('62.0%');
      expect(result.loginBased.rolling.rolling_D1_D7.label).toBe('62.0% (n=100)');

      // Purchase Based Exact Checks
      expect(result.purchaseBased.exactDay.D1.rate).toBe(0.12);
      expect(result.purchaseBased.exactDay.D1.percentage).toBe('12.0%');
      expect(result.purchaseBased.exactDay.D1.label).toBe('12.0% (n=100)');
    });
  });

  describe('VendorOpportunityModel Known-Answer Fixture Test', () => {
    it('accurately excludes idle vendors and computes opportunity-adjusted retention with SLAs', () => {
      // 20 registered vendors: v_01 to v_20
      const registeredVendorIds = Array.from({ length: 20 }, (_, i) => `v_${String(i + 1).padStart(2, '0')}`);
      const opportunities: VendorOrderOpportunity[] = [];

      // 10 vendors (v_01 to v_10) receive orders and fulfill within standard SLA (accepted in 1h, fulfilled in 12h)
      for (let i = 1; i <= 10; i++) {
        opportunities.push({
          orderId: `ord_ok_${i}`,
          vendorId: `v_${String(i).padStart(2, '0')}`,
          orderType: 'standard',
          receivedAt: '2026-10-01T08:00:00Z',
          acceptedAt: '2026-10-01T09:00:00Z',
          fulfilledAt: '2026-10-01T20:00:00Z',
          status: 'delivered',
        });
      }

      // 2 vendors (v_11, v_12) receive orders but breach SLA (accepted 20h later > 12h SLA)
      for (let i = 11; i <= 12; i++) {
        opportunities.push({
          orderId: `ord_breach_${i}`,
          vendorId: `v_${String(i).padStart(2, '0')}`,
          orderType: 'standard',
          receivedAt: '2026-10-01T08:00:00Z',
          acceptedAt: '2026-10-02T05:00:00Z', // 21 hours later
          fulfilledAt: '2026-10-03T10:00:00Z',
          status: 'delivered',
        });
      }

      // 1 vendor (v_13) receives order but customer cancelled within 30 min (before SLA expired)
      opportunities.push({
        orderId: 'ord_cancelled_cust',
        vendorId: 'v_13',
        orderType: 'standard',
        receivedAt: '2026-10-01T08:00:00Z',
        customerCancelledAt: '2026-10-01T08:30:00Z',
        status: 'cancelled',
      });

      // Vendors v_14 to v_20 receive 0 orders (idle vendors)

      const metrics = VendorOpportunityModel.evaluateWindow({
        registeredVendorIds,
        opportunities,
        evaluationTimestamp: '2026-10-05T00:00:00Z',
      });

      expect(metrics.totalRegistered).toBe(20);
      // Denominator: 10 fulfilled + 2 neglectful = 12 (v_13 customer-cancelled order excluded from penalty, 7 idle excluded)
      expect(metrics.withOpportunities).toBe(12);
      expect(metrics.idleConstrained).toBe(8); // v_13 (cancelled) + 7 idle = 8
      expect(metrics.fulfilledWithinSLA).toBe(10);
      expect(metrics.neglectful).toBe(2);

      // Retention Rate = 10 / 12 = 0.8333 (83.3%)
      expect(metrics.retentionRate).toBe(0.8333);
      expect(metrics.retentionPercentage).toBe('83.3%');
      expect(metrics.n).toBe(12);
    });
  });
});
