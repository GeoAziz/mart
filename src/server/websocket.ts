import http from 'http';
import { WebSocketServer } from 'ws';
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import type { WebSocketClient } from '@/lib/websocket';
import {
  handleConnection,
  startHeartbeat,
  broadcastMessage,
  generateDemoMetrics,
  generateDemoChartData,
} from '@/lib/websocket';

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

// ── WebSocket server (noServer mode so we control the upgrade) ───────────────

const httpServer = http.createServer((_req, res) => {
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
  console.log(`[WS] Client connected: uid=${ws.userId} role=${ws.role}`);
});

startHeartbeat(clients);

// ── Periodic data push (role-scoped) ─────────────────────────────────────────

setInterval(() => {
  if (clients.size === 0) return;

  // Metrics: admin and vendors only
  broadcastMessage(
    clients,
    { type: 'metrics_update', payload: { metrics: generateDemoMetrics() } },
    (c) => c.role === 'admin' || c.role === 'vendor',
  );

  // Chart data: admin only
  broadcastMessage(
    clients,
    { type: 'chart_data', payload: { chartData: generateDemoChartData() } },
    (c) => c.role === 'admin',
  );

  // Notifications: all authenticated users
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

  // Inventory alerts: admin and the relevant vendor only
  if (Math.random() > 0.9) {
    const demoVendorId = 'demo-vendor-id'; // In production this comes from real data
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

const PORT = parseInt(process.env.WS_PORT ?? '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`[WS] Authenticated WebSocket server running on port ${PORT}`);
});
