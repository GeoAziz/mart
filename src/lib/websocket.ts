import { WebSocket } from 'ws';

export interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  userId: string;
  role: 'customer' | 'vendor' | 'admin';
  vendorId?: string; // set when role === 'vendor'
}

export interface WebSocketMessage {
  type: string;
  payload: any;
}

/**
 * Send a message to a single client.
 */
export const sendMessage = (client: WebSocketClient, message: WebSocketMessage): void => {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
};

/**
 * Broadcast to all clients that pass the optional predicate.
 */
export const broadcastMessage = (
  clients: Set<WebSocketClient>,
  message: WebSocketMessage,
  predicate?: (c: WebSocketClient) => boolean,
): void => {
  const messageString = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && (!predicate || predicate(client))) {
      client.send(messageString);
    }
  });
};

export const handleConnection = (ws: WebSocketClient, clients: Set<WebSocketClient>) => {
  ws.isAlive = true;
  clients.add(ws);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
};

export const startHeartbeat = (clients: Set<WebSocketClient>) => {
  setInterval(() => {
    clients.forEach(ws => {
      if (!ws.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
};

export const generateDemoMetrics = () => ({
  activeUsers: Math.floor(Math.random() * 100) + 50,
  revenue: Math.floor(Math.random() * 10000) + 5000,
  ordersToday: Math.floor(Math.random() * 50) + 20,
  stockAlerts: Math.floor(Math.random() * 5),
});

export const generateDemoChartData = () => ({
  timestamp: new Date().toISOString(),
  sales: Math.floor(Math.random() * 1000) + 500,
  visitors: Math.floor(Math.random() * 200) + 100,
});
