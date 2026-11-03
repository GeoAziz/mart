/**
 * Security and Environment Isolation Guard for Simulation & Mock Adapters.
 * Enforces:
 * 1. Mock payment routes are mounted strictly when NODE_ENV !== 'production' && ENABLE_SIMULATION_PAYMENTS === 'true'.
 * 2. Simulation runners refuse to execute against production Firebase projects or production GA4 streams.
 */

export const ALLOWED_TEST_FIREBASE_PROJECTS = ['mart-ke-test', 'demo-mart-ke', 'localhost', 'test'];
export const FORBIDDEN_PROD_MEASUREMENT_IDS = ['G-LGGM0XDZJ9', 'G-09S1NJ6W15'];

export class SecurityIsolationError extends Error {
  constructor(message: string) {
    super(`[SecurityIsolationViolation] ${message}`);
    this.name = 'SecurityIsolationError';
  }
}

/**
 * Checks whether mock payment adapters are permitted to mount.
 * Default is strictly OFF.
 */
export function areMockPaymentsPermitted(): boolean {
  const isProd = process.env.NODE_ENV === 'production';
  const flagEnabled = process.env.ENABLE_SIMULATION_PAYMENTS === 'true';
  return !isProd && flagEnabled;
}

/**
 * Enforces that simulation runners and test jobs never target production Firebase or GA4 properties.
 * Throws SecurityIsolationError on violation.
 */
export function assertSimulationAllowed(): void {
  // Allow explicit override when running scheduled or controlled synthetic traffic
  if (process.env.ALLOW_PRODUCTION_SIMULATION === 'true') {
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const firebaseProject =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '';
  const measurementId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.GA4_MEASUREMENT_ID || '';

  // 1. Production Mode Guard
  if (isProd) {
    throw new SecurityIsolationError('Simulation runner is strictly forbidden from executing with NODE_ENV=production.');
  }

  // 2. Production GA4 Stream Allowlist Guard
  if (FORBIDDEN_PROD_MEASUREMENT_IDS.includes(measurementId)) {
    throw new SecurityIsolationError(
      `Refusing to run simulation against production GA4 Measurement ID: ${measurementId}`
    );
  }

  // 3. Target Firebase Project Guard
  const isEmulator =
    process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === 'true' ||
    process.env.FIRESTORE_EMULATOR_HOST !== undefined;

  if (!isEmulator && firebaseProject && !ALLOWED_TEST_FIREBASE_PROJECTS.includes(firebaseProject)) {
    throw new SecurityIsolationError(
      `Target Firebase project '${firebaseProject}' is not in the allowed test projects list (${ALLOWED_TEST_FIREBASE_PROJECTS.join(', ')}).`
    );
  }
}

