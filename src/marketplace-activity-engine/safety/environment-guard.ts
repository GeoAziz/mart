/**
 * Fail-Closed Environment and Security Isolation Guard for Marketplace Activity Engine (MAE).
 *
 * Implements strict allowlist verification:
 * 1. Inspects credentials/service-account key on disk or environment.
 * 2. Enforces ALLOWED_SIMULATION_PROJECTS and ALLOWED_EMULATOR_PROJECTS.
 * 3. Rejects missing or empty project/GA4 parameters for synthetic runs.
 * 4. Verifies GA4 test measurement ID matching or absence (mock sink).
 * 5. Compares against secret-backed production GA4 tripwire.
 * 6. Enforces sandbox/simulated payment mode only.
 */

import fs from 'fs';
import path from 'path';

export interface VerifiedExecutionContext {
  environment: 'simulation' | 'emulator';
  provenance: 'synthetic';
  projectId: string;
  runId: string;
  fencingToken: number;
}

export const ALLOWED_SIMULATION_PROJECTS = Object.freeze(['mart-ke-sim']);
export const ALLOWED_EMULATOR_PROJECTS = Object.freeze(['demo-zilacart', 'localhost']);

export class SecurityIsolationError extends Error {
  constructor(message: string) {
    super(`[SecurityIsolationViolation] ${message}`);
    this.name = 'SecurityIsolationError';
  }
}

/**
 * Inspects credentials on disk or environment to extract the actual authenticated GCP project.
 * Does NOT trust caller-supplied parameters.
 */
export function extractActualCredentialProject(): string {
  const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  if (isEmulator) {
    const emuProj = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!emuProj || emuProj.trim() === '') {
      throw new SecurityIsolationError('Emulator execution requires FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.');
    }
    return emuProj.trim();
  }

  // Check explicit Service Account Key path
  const explicitPath = process.env.SERVICE_ACCOUNT_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const defaultPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  const credPath = explicitPath && explicitPath.trim() !== ''
    ? explicitPath
    : fs.existsSync(defaultPath)
      ? defaultPath
      : null;

  if (credPath && fs.existsSync(credPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      if (parsed.project_id && typeof parsed.project_id === 'string' && parsed.project_id.trim() !== '') {
        return parsed.project_id.trim();
      }
    } catch (err: any) {
      throw new SecurityIsolationError(`Failed to parse credentials file at ${credPath}: ${err.message}`);
    }
  }

  // Fallback to environment variables when no credentials file exists
  const envProject = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (envProject && envProject.trim() !== '') {
    return envProject.trim();
  }

  throw new SecurityIsolationError(
    'Unable to verify GCP project identity from credentials or environment. Failing closed.'
  );
}

/**
 * Fail-closed validation for synthetic marketplace simulation execution.
 * Returns VerifiedExecutionContext on success, throws SecurityIsolationError on violation.
 */
export function assertStrictIsolation(): VerifiedExecutionContext {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    throw new SecurityIsolationError(
      'Synthetic execution is permanently barred from executing when NODE_ENV === "production".'
    );
  }

  const actualProject = extractActualCredentialProject();
  const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  const gaId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.GA4_MEASUREMENT_ID || '').trim();
  const testGaId = (process.env.GA4_TEST_MEASUREMENT_ID || '').trim();
  const prodGaSecret = (process.env.PRODUCTION_GA4_MEASUREMENT_ID_SECRET || '').trim();

  // 1. Secondary tripwire: Compare against secret-backed production GA4 ID if present
  if (prodGaSecret !== '' && gaId === prodGaSecret) {
    throw new SecurityIsolationError(
      `Tripwire activated: Target GA4 Measurement ID matches secret-backed production ID '${gaId}'.`
    );
  }

  // 2. Strict Project Allowlist
  if (isEmulator) {
    if (!ALLOWED_EMULATOR_PROJECTS.includes(actualProject)) {
      throw new SecurityIsolationError(
        `Emulator project '${actualProject}' is not in ALLOWED_EMULATOR_PROJECTS (${ALLOWED_EMULATOR_PROJECTS.join(', ')}).`
      );
    }
  } else {
    if (!ALLOWED_SIMULATION_PROJECTS.includes(actualProject)) {
      throw new SecurityIsolationError(
        `Simulation project '${actualProject}' is not in ALLOWED_SIMULATION_PROJECTS (${ALLOWED_SIMULATION_PROJECTS.join(', ')}). Execution barred.`
      );
    }
  }

  // 3. GA4 Measurement ID Allowlist for Synthetic Runs
  // Must strictly equal GA4_TEST_MEASUREMENT_ID or be empty (mock sink)
  if (gaId !== '' && gaId !== testGaId) {
    throw new SecurityIsolationError(
      `Synthetic execution attempted to use unapproved GA4 ID '${gaId}'. Must match GA4_TEST_MEASUREMENT_ID ('${testGaId || '<empty>'}').`
    );
  }

  // 4. Payment Provider Validation
  const paymentProvider = (process.env.PAYMENT_PROVIDER_MODE || 'simulated').toLowerCase();
  if (paymentProvider !== 'simulated' && paymentProvider !== 'mock') {
    throw new SecurityIsolationError(
      `Synthetic runner attempted to execute with non-sandbox payment provider '${paymentProvider}'. Must be 'simulated' or 'mock'.`
    );
  }

  const runId = process.env.SIMULATION_RUN_ID || `run_${Date.now()}`;
  const fencingToken = Number(process.env.SIMULATION_FENCING_TOKEN || 1);

  return {
    environment: isEmulator ? 'emulator' : 'simulation',
    provenance: 'synthetic',
    projectId: actualProject,
    runId,
    fencingToken,
  };
}

/**
 * Checks whether mock payments are allowed in the current runtime context.
 */
export function areMockPaymentsPermitted(): boolean {
  const isProd = process.env.NODE_ENV === 'production';
  const flagEnabled = process.env.ENABLE_SIMULATION_PAYMENTS === 'true';
  return !isProd && flagEnabled;
}
