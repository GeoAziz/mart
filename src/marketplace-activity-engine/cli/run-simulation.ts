#!/usr/bin/env tsx
/**
 * Marketplace Activity Engine (MAE) Simulation CLI Runner.
 *
 * Usage:
 *   npx tsx src/marketplace-activity-engine/cli/run-simulation.ts [options]
 *
 * Options:
 *   --date=<YYYY-MM-DD>     Reporting date (defaults to current date in Africa/Nairobi)
 *   --customers=<number>    Max customers to schedule
 *   --vendors=<number>      Max vendors to schedule
 *   --salt=<string>         Run salt for deterministic PRNG
 *   --dry-run               Validate isolation & schedule without executing journeys
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { ActivityOrchestrator } from '../orchestrator/activity-orchestrator';
import { assertStrictIsolation } from '../safety/environment-guard';
import { toNairobiDateString } from '../retention/timezone-utils';

function parseArgs(): {
  dateStr: string;
  customers?: number;
  vendors?: number;
  salt?: string;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  let dateStr = toNairobiDateString(new Date());
  let customers: number | undefined;
  let vendors: number | undefined;
  let salt: string | undefined;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--date=')) {
      dateStr = arg.split('=')[1];
    } else if (arg.startsWith('--customers=')) {
      customers = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--vendors=')) {
      vendors = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--salt=')) {
      salt = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  return { dateStr, customers, vendors, salt, dryRun };
}

async function main() {
  const { dateStr, customers, vendors, salt, dryRun } = parseArgs();

  console.log('\n======================================================');
  console.log('🚀 Marketplace Activity Engine (MAE) Runner');
  console.log('======================================================');
  console.log(`Date:        ${dateStr} (Africa/Nairobi)`);
  console.log(`Dry Run:     ${dryRun ? 'YES (Validation Only)' : 'NO (Live Journeys)'}`);

  // 1. Fail-closed Isolation Check
  console.log('\n[1/3] Verifying environment isolation...');
  const envContext = assertStrictIsolation();
  console.log(`  -> Environment: ${envContext.environment}`);
  console.log(`  -> Target Project: ${envContext.projectId}`);
  console.log(`  -> Provenance: ${envContext.provenance}`);

  if (dryRun) {
    console.log('\n✅ [Dry Run] Environment isolation validated. Exiting without mutating state.');
    process.exit(0);
  }

  // 2. Execute Orchestration
  console.log('\n[2/3] Orchestrating simulation journeys...');
  const report = await ActivityOrchestrator.run({
    dateStr,
    customerLimit: customers,
    vendorLimit: vendors,
    runSalt: salt,
  });

  // 3. Output Report
  console.log('\n[3/3] Execution Summary:');
  console.log('------------------------------------------------------');
  console.log(`Run ID:              ${report.runId}`);
  console.log(`Fencing Token:       ${report.fencingToken}`);
  console.log(`Duration:            ${(report.durationMs / 1000).toFixed(2)}s`);
  console.log(`Status:              ${report.status}`);
  console.log('------------------------------------------------------');
  console.log('CUSTOMER ACTIVITY');
  console.log(`  Planned:           ${report.stats.plannedCustomers}`);
  console.log(`  Executed:          ${report.stats.executedCustomers}`);
  console.log(`  Completed Orders:  ${report.stats.completedOrders}`);
  console.log(`  Abandoned Carts:   ${report.stats.abandonedCarts}`);
  console.log(`  Payment Failures:  ${report.stats.paymentFailures}`);
  console.log(`  Stockout Abandons: ${report.stats.stockoutAbandons}`);
  console.log('------------------------------------------------------');
  console.log('VENDOR ACTIVITY');
  console.log(`  Planned:           ${report.stats.plannedVendors}`);
  console.log(`  Fulfilled Orders:  ${report.stats.fulfilledOrders}`);
  console.log(`  Rejected Orders:   ${report.stats.rejectedOrders}`);
  console.log('======================================================\n');
}

if (require.main === module || process.argv[1]?.includes('run-simulation')) {
  main().catch((err) => {
    console.error('\n❌ Fatal Simulation Error:', err.message);
    process.exit(1);
  });
}

export { main, parseArgs };
