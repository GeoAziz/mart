import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  areMockPaymentsPermitted,
  assertSimulationAllowed,
  SecurityIsolationError,
} from '../simulation-guard';

describe('Security and Environment Isolation Guard (simulation-guard compatibility)', () => {
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
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mart-ke-sim';
      process.env.GA4_TEST_MEASUREMENT_ID = 'G-TEST-ALLOWED';
      process.env.GA4_MEASUREMENT_ID = 'G-TEST-ALLOWED';

      expect(() => assertSimulationAllowed()).toThrow(SecurityIsolationError);
      expect(() => assertSimulationAllowed()).toThrow(/permanently barred/);
    });

    it('throws when targeting unauthorized production Firebase project', () => {
      (process.env as any).NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mart-ke'; // Production project
      process.env.GA4_TEST_MEASUREMENT_ID = 'G-TEST-ALLOWED';
      process.env.GA4_MEASUREMENT_ID = 'G-TEST-ALLOWED';
      delete process.env.FIRESTORE_EMULATOR_HOST;

      expect(() => assertSimulationAllowed()).toThrow(SecurityIsolationError);
      expect(() => assertSimulationAllowed()).toThrow(/not in ALLOWED_SIMULATION_PROJECTS/);
    });

    it('passes when targeting emulator and non-production GA4 stream in development', () => {
      (process.env as any).NODE_ENV = 'development';
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-zilacart';
      process.env.GA4_TEST_MEASUREMENT_ID = 'G-TEST-ALLOWED';
      process.env.GA4_MEASUREMENT_ID = 'G-TEST-ALLOWED';
      process.env.PAYMENT_PROVIDER_MODE = 'mock';

      expect(() => assertSimulationAllowed()).not.toThrow();
    });
  });
});
