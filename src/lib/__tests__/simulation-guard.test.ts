import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  areMockPaymentsPermitted,
  assertSimulationAllowed,
  SecurityIsolationError,
  FORBIDDEN_PROD_MEASUREMENT_IDS,
} from '../simulation-guard';

describe('Security and Environment Isolation Guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    (process.env as any) = { ...originalEnv };
  });

  describe('areMockPaymentsPermitted', () => {
    it('returns false by default when flag is absent', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.ENABLE_SIMULATION_PAYMENTS;
      expect(areMockPaymentsPermitted()).toBe(false);
    });

    it('returns false when NODE_ENV is production even if flag is true', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.ENABLE_SIMULATION_PAYMENTS = 'true';
      expect(areMockPaymentsPermitted()).toBe(false);
    });

    it('returns true only when NODE_ENV !== production and ENABLE_SIMULATION_PAYMENTS === true', () => {
      (process.env as any).NODE_ENV = 'development';
      process.env.ENABLE_SIMULATION_PAYMENTS = 'true';
      expect(areMockPaymentsPermitted()).toBe(true);
    });
  });

  describe('assertSimulationAllowed', () => {
    it('throws when NODE_ENV is production', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mart-ke-test';
      process.env.GA4_MEASUREMENT_ID = 'G-TEST-ALLOWED';

      expect(() => assertSimulationAllowed()).toThrow(SecurityIsolationError);
      expect(() => assertSimulationAllowed()).toThrow('strictly forbidden from executing with NODE_ENV=production');
    });

    it('throws when targeting production GA4 Measurement ID', () => {
      (process.env as any).NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mart-ke-test';

      for (const prodId of FORBIDDEN_PROD_MEASUREMENT_IDS) {
        process.env.GA4_MEASUREMENT_ID = prodId;
        expect(() => assertSimulationAllowed()).toThrow(SecurityIsolationError);
        expect(() => assertSimulationAllowed()).toThrow(`Refusing to run simulation against production GA4 Measurement ID: ${prodId}`);
      }
    });

    it('throws when targeting unauthorized production Firebase project', () => {
      (process.env as any).NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mart-ke'; // Production project
      process.env.GA4_MEASUREMENT_ID = 'G-TEST-ALLOWED';
      delete process.env.NEXT_PUBLIC_FIREBASE_EMULATOR;
      delete process.env.FIRESTORE_EMULATOR_HOST;

      expect(() => assertSimulationAllowed()).toThrow(SecurityIsolationError);
      expect(() => assertSimulationAllowed()).toThrow("Target Firebase project 'mart-ke' is not in the allowed test projects list");
    });

    it('passes when targeting emulator and non-production GA4 stream in development', () => {
      (process.env as any).NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mart-ke-test';
      process.env.NEXT_PUBLIC_FIREBASE_EMULATOR = 'true';
      process.env.GA4_MEASUREMENT_ID = 'G-TEST-ALLOWED';
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST-ALLOWED';

      expect(() => assertSimulationAllowed()).not.toThrow();
    });
  });
});
