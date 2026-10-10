/**
 * Cross-process realtime event bus.
 *
 * The Next.js app *publishes* real business events (orders, inventory alerts,
 * notifications) to a Redis channel; the standalone WebSocket server
 * *subscribes* and fans them out to connected clients. This lets the WS server
 * scale horizontally (multiple instances all subscribe to the same channel)
 * instead of broadcasting only to locally-connected sockets.
 *
 * When Redis is unavailable the publisher degrades gracefully to a no-op so the
 * app never fails because realtime is down.
 */
import { createClient } from 'redis';

export interface WsEventPayload {
  /** Event type delivered to the client, e.g. 'sale' | 'notification' | 'inventory_alert' */
  type: string;
  payload: any;
  /** Deliver only to clients with one of these roles */
  roles?: Array<'customer' | 'vendor' | 'admin'>;
  /** Deliver only to these user IDs */
  userIds?: string[];
  /** Deliver only to clients whose vendorId is in this list */
  vendorIds?: string[];
}

export const WS_EVENT_CHANNEL = 'zilacart:ws:events';

let pubClient: ReturnType<typeof createClient> | null = null;
let connected = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialise the Redis publisher connection (idempotent). Call once at app
 * startup (instrumentation hook) — publishing before this completes is a no-op.
 */
export function initWsPublisher(): Promise<void> {
  if (!initPromise) {
    initPromise = doInitPublisher();
  }
  return initPromise;
}

async function doInitPublisher(): Promise<void> {
  if (pubClient) return;
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    console.log('[WS-Events] Redis not configured, realtime events disabled');
    return;
  }
  try {
    const url =
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
    pubClient = createClient({ url });
    pubClient.on('error', (err) => {
      console.error('[WS-Events] Redis publisher error:', err);
      connected = false;
    });
    pubClient.on('end', () => {
      connected = false;
    });
    await pubClient.connect();
    connected = true;
    console.log('[WS-Events] Redis publisher ready');
  } catch (err) {
    console.warn('[WS-Events] Redis publisher unavailable, realtime events disabled:', err);
    connected = false;
  }
}

/**
 * Publish a realtime event. Safe to call from any code path; never throws.
 */
export async function publishWSEvent(event: WsEventPayload): Promise<void> {
  if (!connected || !pubClient) return;
  try {
    await pubClient.publish(WS_EVENT_CHANNEL, JSON.stringify(event));
  } catch (err) {
    console.warn('[WS-Events] Publish failed:', err);
  }
}

/**
 * Create a Redis *subscriber* client for the WebSocket server process.
 * The caller owns the returned client (must subscribe + close).
 */
export function createWsSubscriber() {
  const url =
    process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
  return createClient({ url });
}

export function isWsPublisherConnected(): boolean {
  return connected;
}
