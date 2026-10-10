import http from 'http';
import { WebSocketServer } from 'ws';
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { Registry, Gauge, Counter } from 'prom-client';
import type { WebSocketClient } from '@/lib/websocket';
import {
  handleConnection,
  startHeartbeat,
  broadcastMessage,
  generateDemoMetrics,
  generateDemoChartData,
} from '@/lib/websocket';
import { WS_EVENT_CHANNEL, createWsSubscriber } from '@/lib/ws-events';

// ── Firebase Admin (standalone process – initialised separately from Next.js) ──

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  // Emulator mode: FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST
  // are set (docker compose local stack), so no service account is required.
  const emulatorMode = !!(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  let credential: admin.credential.Credential | undefined;

  if (fs.existsSync(keyPath)) {
    const raw = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    const sa: ServiceAccount = {
      projectId: raw.projectId || raw.project_id,
      clientEmail: raw.clientEmail || raw.client_email,
      privateKey: (raw.privateKey || raw.private_key || '').replace(/\\n/g, '\n'),
    };
    credential = admin.credential.cert(sa);
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY ?? '';
    if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    } as ServiceAccount);
  }

  if (!credential && !emulatorMode) {
    throw new Error(
      '[WS] Missing Firebase credentials. Provide serviceAccountKey.json or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY, or run against emulators (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST).',
    );
  }

  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'zilacart-local',
    ...(credential ? { credential } : {}),
  });
  console.log(`✅ [WS] Firebase Admin initialized${emulatorMode ? ' (emulator mode)' : ''}`);
}

initFirebaseAdmin();

// ── Prometheus metrics (scraped at /metrics by the mart-websocket job) ───────

const wsRegistry = new Registry();

const wsConnectedClients = new Gauge({
  name: 'ws_connected_clients',
  help: 'Currently connected authenticated WebSocket clients',
  registers: [wsRegistry],
});

const wsConnectionsTotal = new Counter({
  name: 'ws_connections_total',
  help: 'Total accepted WebSocket connections',
  labelNames: ['role'],
  registers: [wsRegistry],
});

const wsMessagesSent = new Counter({
  name: 'ws_messages_sent_total',
  help: 'Total messages broadcast to WebSocket clients',
  labelNames: ['type'],
  registers: [wsRegistry],
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the Bearer token from an HTTP upgrade request's Authorization header
 * or from the `token` query-string parameter (useful for browser clients that
 * cannot set arbitrary headers on WebSocket handshake).
 */
function extractToken(req: http.IncomingMessage): string | null {
  const authHeader = req.headers['authorization'] ?? '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim() || null;
  }
  // Fallback: ?token=<idToken>
  const url = new URL(req.url ?? '/', 'http://localhost');
  return url.searchParams.get('token');
}

/**
 * Verify a Firebase ID token and return the user's uid + Firestore role.
 * Returns null if the token is invalid or the user profile cannot be loaded.
 */
async function verifyToken(
  token: string,
): Promise<{ uid: string; role: 'customer' | 'vendor' | 'admin'; vendorId?: string } | null> {
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const userDoc = await admin.firestore().collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) return null;

    const data = userDoc.data()!;
    const role: 'customer' | 'vendor' | 'admin' = data.role ?? 'customer';
    return { uid: decoded.uid, role, vendorId: role === 'vendor' ? decoded.uid : undefined };
  } catch {
    return null;
  }
}

// ── HTTP server (noServer mode so we control the upgrade) ────────────────────

const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/metrics') {
    try {
      const metrics = await wsRegistry.metrics();
      res.writeHead(200, { 'Content-Type': wsRegistry.contentType });
      res.end(metrics);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Metrics error: ${(err as Error).message}`);
    }
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ZilaCart WebSocket server');
});

const wss = new WebSocketServer({ noServer: true });
const clients: Set<WebSocketClient> = new Set();

httpServer.on('upgrade', async (req, socket, head) => {
  const token = extractToken(req);

  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const identity = await verifyToken(token);
  if (!identity) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    const client = ws as WebSocketClient;
    client.userId = identity.uid;
    client.role = identity.role;
    client.vendorId = identity.vendorId;
    wss.emit('connection', client, req);
  });
});

wss.on('connection', (ws: WebSocketClient) => {
  handleConnection(ws, clients);
  wsConnectedClients.set(clients.size);
  wsConnectionsTotal.labels(ws.role).inc();
  ws.on('close', () => {
    wsConnectedClients.set(clients.size);
  });
  console.log(`[WS] Client connected: uid=${ws.userId} role=${ws.role}`);
});

startHeartbeat(clients);

// ── Real-time event fan-out via Redis pub/sub ────────────────────────────────
//
// The Next.js app publishes business events (orders, notifications, inventory)
// to the WS_EVENT_CHANNEL. Every WS server instance subscribes, so fan-out
// works across multiple instances. Clients are matched by role / userId /
// vendorId in the event payload.

interface RedisWsEvent {
  type: string;
  payload: any;
  roles?: Array<'customer' | 'vendor' | 'admin'>;
  userIds?: string[];
  vendorIds?: string[];
}

function clientMatches(event: RedisWsEvent, client: WebSocketClient): boolean {
  if (event.roles && event.roles.length > 0 && !event.roles.includes(client.role)) {
    return false;
  }
  if (event.userIds && event.userIds.length > 0 && !event.userIds.includes(client.userId)) {
    return false;
  }
  if (event.vendorIds && event.vendorIds.length > 0 && !event.vendorIds.includes(client.vendorId || '')) {
    return false;
  }
  return true;
}

async function connectRealtimeSource() {
  const subscriber = createWsSubscriber();
  subscriber.on('error', (err) => {
    console.error('[WS] Redis subscriber error:', err);
  });
  subscriber.on('end', () => {
    console.warn('[WS] Redis subscriber disconnected; realtime events paused');
  });

  try {
    await subscriber.connect();
    await subscriber.subscribe(WS_EVENT_CHANNEL, (message) => {
      try {
        const event = JSON.parse(message) as RedisWsEvent;
        broadcastMessage(
          clients,
          { type: event.type, payload: event.payload },
          (c) => clientMatches(event, c),
        );
        wsMessagesSent.labels(event.type).inc();
      } catch (err) {
        console.error('[WS] Failed to handle realtime event:', err);
      }
    });
    console.log('[WS] Real-time event channel connected');
  } catch (err) {
    console.warn('[WS] Real-time channel unavailable (Redis down); only local broadcasts active:', err);
  }
}

connectRealtimeSource();

// ── Periodic demo data push (opt-in) ─────────────────────────────────────────
//
// Synthetic payloads are only emitted when WS_DEMO_MODE=true. In production the
// server forwards real events from the Redis channel instead.

const demoMode = process.env.WS_DEMO_MODE === 'true';

if (demoMode) {
  setInterval(() => {
    if (clients.size === 0) return;

    broadcastMessage(
      clients,
      { type: 'metrics_update', payload: { metrics: generateDemoMetrics() } },
      (c) => c.role === 'admin' || c.role === 'vendor',
    );

    broadcastMessage(
      clients,
      { type: 'chart_data', payload: { chartData: generateDemoChartData() } },
      (c) => c.role === 'admin',
    );

    if (Math.random() > 0.7) {
      broadcastMessage(clients, {
        type: 'notification',
        payload: {
          id: Date.now().toString(),
          type: 'sale',
          message: 'New sale completed!',
          severity: 'success',
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (Math.random() > 0.9) {
      const demoVendorId = 'demo-vendor-id';
      broadcastMessage(
        clients,
        {
          type: 'inventory_alert',
          payload: {
            productId: '123',
            productName: 'Sample Product',
            currentStock: 5,
            threshold: 10,
            severity: 'warning',
          },
        },
        (c) => c.role === 'admin' || c.vendorId === demoVendorId,
      );
    }
  }, 5000);
} else {
  console.log('[WS] Demo mode disabled — forwarding real events from Redis channel');
}

const PORT = parseInt(process.env.WS_PORT ?? '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`[WS] Authenticated WebSocket server running on port ${PORT}`);
});
