import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  assertStrictIsolation,
  areMockPaymentsPermitted,
  SecurityIsolationError,
  ALLOWED_SIMULATION_PROJECTS,
  ALLOWED_EMULATOR_PROJECTS,
} from '@/marketplace-activity-engine/safety/environment-guard';

describe('Marketplace Activity Engine - Fail-Closed EnvironmentGuard', () => {
  const originalEnv = { ...process.env };
  let tempKeyPath: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Create a temporary mock service account path
    tempKeyPath = path.join(os.tmpdir(), `mock-sa-${Date.now()}-${Math.random()}.json`);
  });

  afterEach(() => {
    (process.env as any) = { ...originalEnv };
    if (fs.existsSync(tempKeyPath)) {
      try {
        fs.unlinkSync(tempKeyPath);
      } catch {}
    }
  });

  function writeMockServiceAccount(projectId: string) {
    fs.writeFileSync(tempKeyPath, JSON.stringify({ project_id: projectId }));
    process.env.SERVICE_ACCOUNT_KEY_PATH = tempKeyPath;
  }

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

  describe('assertStrictIsolation (Fail-Closed Allowlist)', () => {
    it('throws when NODE_ENV is production', () => {
      (process.env as any).NODE_ENV = 'production';
      writeMockServiceAccount('mart-ke-sim');
      process.env.GA4_TEST_MEASUREMENT_ID = 'G-TEST-1234';
      process.env.GA4_MEASUREMENT_ID = 'G-TEST-1234';

      expect(() => assertStrictIsolation()).toThrow(SecurityIsolationError);
      expect(() => assertStrictIsolation()).toThrow(/permanently barred/);
    });

    it('throws when unable to verify project identity (fails closed)', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.FIRESTORE_EMULATOR_HOST;
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      // Point to a non-existent path so serviceAccountKey.json in cwd isn't read
      process.env.SERVICE_ACCOUNT_KEY_PATH = path.join(os.tmpdir(), 'non-existent-sa.json');

      expect(() => assertStrictIsolation()).toThrow(SecurityIsolationError);
      expect(() => assertStrictIsolation()).toThrow(/Unable to verify GCP project identity/);
    });

    it('throws when targeting production Firebase project mart-ke', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.FIRESTORE_EMULATOR_HOST;
      writeMockServiceAccount('mart-ke');
      process.env.GA4_TEST_MEASUREMENT_ID = 'G-TEST-1234';
      process.env.GA4_MEASUREMENT_ID = 'G-TEST-1234';

      expect(() => assertStrictIsolation()).toThrow(SecurityIsolationError);
      expect(() => assertStrictIsolation()).toThrow(/not in ALLOWED_SIMULATION_PROJECTS/);
    });

    it('throws when emulator project is not in ALLOWED_EMULATOR_PROJECTS', () => {
      (process.env as any).NODE_ENV = 'development';
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      process.env.FIREBASE_PROJECT_ID = 'mart-ke-test'; // Not in allowlist
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      process.env.GA4_TEST_MEASUREMENT_ID = 'G-TEST-1234';
      process.env.GA4_MEASUREMENT_ID = 'G-TEST-1234';

      expect(() => assertStrictIsolation()).toThrow(SecurityIsolationError);
      expect(() => assertStrictIsolation()).toThrow(/not in ALLOWED_EMULATOR_PROJECTS/);
    });

    it('throws when GA4 Measurement ID does not match GA4_TEST_MEASUREMENT_ID', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.FIRESTORE_EMULATOR_HOST;
      writeMockServiceAccount('mart-ke-sim');
      process.env.GA4_TEST_MEASUREMENT_ID = 'G-TEST-APPROVED';
      process.env.GA4_MEASUREMENT_ID = 'G-UNAPPROVED-ID';

      expect(() => assertStrictIsolation()).toThrow(SecurityIsolationError);
      expect(() => assertStrictIsolation()).toThrow(/attempted to use unapproved GA4 ID/);
    });

    it('trips secret-backed production GA4 tripwire', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.FIRESTORE_EMULATOR_HOST;
      writeMockServiceAccount('mart-ke-sim');
      process.env.PRODUCTION_GA4_MEASUREMENT_ID_SECRET = 'G-PROD-SECRET';
      process.env.GA4_MEASUREMENT_ID = 'G-PROD-SECRET';
      process.env.GA4_TEST_MEASUREMENT_ID = 'G-PROD-SECRET';

      expect(() => assertStrictIsolation()).toThrow(SecurityIsolationError);
      expect(() => assertStrictIsolation()).toThrow(/Tripwire activated/);
    });

    it('throws when non-sandbox payment provider is attempted', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.FIRESTORE_EMULATOR_HOST;
      writeMockServiceAccount('mart-ke-sim');
      process.env.GA4_TEST_MEASUREMENT_ID = 'G-TEST-1234';
      process.env.GA4_MEASUREMENT_ID = 'G-TEST-1234';
      process.env.PAYMENT_PROVIDER_MODE = 'daraja_live';

      expect(() => assertStrictIsolation()).toThrow(SecurityIsolationError);
      expect(() => assertStrictIsolation()).toThrow(/non-sandbox payment provider/);
    });

    it('passes for allowed simulation project mart-ke-sim with test GA stream', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.FIRESTORE_EMULATOR_HOST;
      writeMockServiceAccount('mart-ke-sim');
      process.env.GA4_TEST_MEASUREMENT_ID = 'G-TEST-APPROVED';
      process.env.GA4_MEASUREMENT_ID = 'G-TEST-APPROVED';
      process.env.PAYMENT_PROVIDER_MODE = 'simulated';

      const ctx = assertStrictIsolation();
      expect(ctx.environment).toBe('simulation');
      expect(ctx.provenance).toBe('synthetic');
      expect(ctx.projectId).toBe('mart-ke-sim');
    });

    it('passes for allowed emulator project demo-zilacart with mock sink', () => {
      (process.env as any).NODE_ENV = 'development';
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      process.env.FIREBASE_PROJECT_ID = 'demo-zilacart';
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      delete process.env.GA4_MEASUREMENT_ID;
      delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
      process.env.PAYMENT_PROVIDER_MODE = 'mock';

      const ctx = assertStrictIsolation();
      expect(ctx.environment).toBe('emulator');
      expect(ctx.provenance).toBe('synthetic');
      expect(ctx.projectId).toBe('demo-zilacart');
    });
  });
});
