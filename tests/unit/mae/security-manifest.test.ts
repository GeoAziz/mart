import { describe, it, expect } from 'vitest';
import {
  assertSecurityAuthorization,
  ProductionContaminationError
} from '@/marketplace-activity-engine/safety/security-manifest';

describe('T01: Security Authorization Manifest & Environment Guard', () => {
  it('allows authorized simulation runs on demo-zilacart and mart-ke-sim', () => {
    expect(() => {
      assertSecurityAuthorization('sim_run_test_01', 'G-YV6C8Q312S', 'demo-zilacart');
    }).not.toThrow();

    expect(() => {
      assertSecurityAuthorization('sim_run_test_02', 'G-YV6C8Q312S', 'mart-ke-sim');
    }).not.toThrow();
  });

  it('fails closed when attempting to run against production project mart-ke', () => {
    expect(() => {
      assertSecurityAuthorization('sim_run_test_03', 'G-YV6C8Q312S', 'mart-ke');
    }).toThrow(ProductionContaminationError);
  });

  it('fails closed when an unauthorized GA4 measurement ID is passed', () => {
    expect(() => {
      assertSecurityAuthorization('sim_run_test_04', 'G-PROD999999', 'mart-ke-sim');
    }).toThrow(ProductionContaminationError);
  });

  it('fails closed when simulationRunId is missing', () => {
    expect(() => {
      assertSecurityAuthorization('', 'G-YV6C8Q312S', 'mart-ke-sim');
    }).toThrow(ProductionContaminationError);
  });
});
