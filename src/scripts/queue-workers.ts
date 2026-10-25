/**
 * Queue Workers Orchestrator
 * Starts all background workers for message processing
 *
 * Usage: npm run queue:workers
 */

import {
  startOrderWorker,
  startProductWorker,
  startPaymentWorker,
  startNotificationWorker,
} from '@/lib/queue-service';
import { runReservationExpiryWorker } from '@/scripts/workers/reservation-expiry';
import { startAnalyticsOutboxWorker } from '@/lib/analytics-worker';
import { initializeRedis } from '@/lib/cache-service';
import { initWsPublisher } from '@/lib/ws-events';

async function main() {
  console.log('🚀 Starting message queue workers...\n');

  // Shared infrastructure: distributed cache/rate-limit backend + realtime bus.
  await initializeRedis();
  await initWsPublisher();

  // Start all workers in parallel
  const workers = [
    {
      name: 'Order Worker',
      start: startOrderWorker,
    },
    {
      name: 'Product Worker',
      start: startProductWorker,
    },
    {
      name: 'Payment Worker',
      start: startPaymentWorker,
    },
    {
      name: 'Notification Worker',
      start: startNotificationWorker,
    },
    {
      name: 'Reservation Expiry Worker',
      start: async () => setInterval(() => runReservationExpiryWorker().catch(console.error), 5 * 60 * 1000),
    },
    {
      name: 'Analytics Outbox Worker',
      start: async () => startAnalyticsOutboxWorker(30000), // Run every 30 seconds
    },
  ];

  // Start all workers
  workers.forEach(({ name, start }) => {
    console.log(`📦 Starting ${name}...`);
    start().catch((error) => {
      console.error(`❌ ${name} failed:`, error);
      process.exit(1);
    });
  });

  console.log('\n✅ All workers started');
  console.log('Press Ctrl+C to stop\n');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down workers...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down workers...');
    process.exit(0);
  });
}

main();
