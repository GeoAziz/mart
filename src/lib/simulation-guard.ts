/**
 * Security and Environment Isolation Guard for Simulation & Mock Adapters.
 * Re-exports from src/marketplace-activity-engine/safety/environment-guard.ts
 *
 * NOTE: ALLOW_PRODUCTION_SIMULATION has been permanently removed to safeguard
 * production GA4 retention metrics and Firestore integrity.
 */

export {
  assertStrictIsolation,
  assertStrictIsolation as assertSimulationAllowed,
  areMockPaymentsPermitted,
  SecurityIsolationError,
  ALLOWED_SIMULATION_PROJECTS,
  ALLOWED_EMULATOR_PROJECTS,
} from '@/marketplace-activity-engine/safety/environment-guard';
