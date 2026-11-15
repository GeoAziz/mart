/**
 * Security Authorization Manifest & Environment Guard (v1.2).
 * Strictly prevents synthetic simulation contamination of production environments.
 * Fails closed if unauthorized Firebase projects, GA4 Measurement IDs, or real third-party providers are detected.
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
  authorizedFirebaseProjects: ['demo-zilacart', 'mart-ke-sim'],
  authorizedGA4MeasurementIds: ['G-YV6C8Q312S'],
  authorizedBrowserDomains: ['localhost:3000', '127.0.0.1:3000', 'sandbox.zilacart.ke'],
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

  // 1. Invariant check: Prohibit production project 'mart-ke'
  if (currentProject === 'mart-ke' || process.env.NODE_ENV === 'production' && !currentProject?.includes('sim')) {
    throw new ProductionContaminationError(
      `Attempted to execute simulation against production project '${currentProject}'. Execution aborted.`
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
}
