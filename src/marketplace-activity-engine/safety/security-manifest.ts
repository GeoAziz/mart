/**
 * Security Authorization Manifest & Environment Guard (v1.2).
 * Strictly prevents unintended synthetic simulation contamination.
 *
 * In standard mode: Fails closed against production projects.
 * In authorized hybrid mode (ALLOW_MART_KE_SIMULATION === 'true'):
 * Permits targeted synthetic runs on 'mart-ke' and production GA4 streams
 * provided mock payment providers and synthetic data flags are enforced.
 */

export interface SecurityAuthorizationManifest {
  simulationRunId: string;
  enforceIsolatedExecution: boolean;

  authorizedFirebaseProjects: readonly string[];
  authorizedGA4MeasurementIds: readonly string[];
  authorizedBrowserDomains: readonly string[];

  mockAdaptersEnforced: {
    smsProvider: 'InMemoryMockSmsProvider';
    paymentProvider: 'SimulatedPaymentAdapter';
    payoutProvider: 'SimulatedPayoutAdapter';
  };

  secretsOrigin: 'SERVER_PROCESS_ENV_ONLY';
}

export const CANONICAL_SECURITY_MANIFEST: SecurityAuthorizationManifest = {
  simulationRunId: 'pending_initialization',
  enforceIsolatedExecution: true,
  authorizedFirebaseProjects: ['demo-zilacart', 'mart-ke-sim', 'mart-ke'],
  authorizedGA4MeasurementIds: ['G-YV6C8Q312S', 'G-09S1NJ6W15', 'G-LGGM0XDZJ9'],
  authorizedBrowserDomains: ['localhost:3000', '127.0.0.1:3000', 'sandbox.zilacart.ke', 'zilacart.ke'],
  mockAdaptersEnforced: {
    smsProvider: 'InMemoryMockSmsProvider',
    paymentProvider: 'SimulatedPaymentAdapter',
    payoutProvider: 'SimulatedPayoutAdapter'
  },
  secretsOrigin: 'SERVER_PROCESS_ENV_ONLY'
};

export class ProductionContaminationError extends Error {
  constructor(message: string) {
    super(`[FATAL_PRODUCTION_CONTAMINATION_DETECTED] ${message}`);
    this.name = 'ProductionContaminationError';
  }
}

/**
 * Validates the runtime environment against the Security Authorization Manifest.
 * Must be executed before any journey, agent, or outbox worker initializes.
 */
export function assertSecurityAuthorization(
  runId: string,
  measurementId?: string,
  projectId?: string
): void {
  const currentProject = projectId || process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const currentMeasurementId = measurementId || process.env.GA4_TEST_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const allowMartKe = process.env.ALLOW_MART_KE_SIMULATION === 'true';

  // 1. Production Project Guard: Allow mart-ke ONLY when explicitly authorized via ALLOW_MART_KE_SIMULATION
  if (currentProject === 'mart-ke' && !allowMartKe) {
    throw new ProductionContaminationError(
      `Attempted to execute simulation against production project '${currentProject}' without explicit ALLOW_MART_KE_SIMULATION=true flag. Execution barred.`
    );
  }

  // 2. Validate Firebase Project against allowlist
  if (currentProject && !CANONICAL_SECURITY_MANIFEST.authorizedFirebaseProjects.includes(currentProject)) {
    throw new ProductionContaminationError(
      `Unauthorized Firebase project '${currentProject}'. Authorized projects: ${CANONICAL_SECURITY_MANIFEST.authorizedFirebaseProjects.join(', ')}`
    );
  }

  // 3. Validate GA4 Measurement ID
  if (currentMeasurementId && !CANONICAL_SECURITY_MANIFEST.authorizedGA4MeasurementIds.includes(currentMeasurementId)) {
    throw new ProductionContaminationError(
      `Unauthorized GA4 Measurement ID '${currentMeasurementId}'. Authorized IDs: ${CANONICAL_SECURITY_MANIFEST.authorizedGA4MeasurementIds.join(', ')}`
    );
  }

  // 4. Validate run ID presence
  if (!runId || typeof runId !== 'string' || runId.trim().length === 0) {
    throw new ProductionContaminationError('A valid simulationRunId is mandatory for all MAE operations.');
  }

  // 5. Money Guard Invariant: Payment provider must ALWAYS be simulated/mock (NEVER live M-Pesa)
  const paymentProvider = (process.env.PAYMENT_PROVIDER_MODE || 'simulated').toLowerCase();
  if (paymentProvider !== 'simulated' && paymentProvider !== 'mock') {
    throw new ProductionContaminationError(
      `Live payment provider detected ('${paymentProvider}'). Real money transactions are strictly prohibited during simulation.`
    );
  }
}
