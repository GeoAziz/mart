import { WebSocket } from 'ws';

export interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  userId?: string;
}

export interface WebSocketMessage {
  type: 'sale' | 'inventory_alert' | 'inventory_update' | 'notification' | 'metrics_update' | 'chart_data';
  payload: any;
}

export const broadcastMessage = (clients: Set<WebSocketClient>, message: WebSocketMessage) => {
  const messageString = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
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
  }, 30000); // Check every 30 seconds
};

// Utility to generate random metrics for demo purposes
export const generateDemoMetrics = () => {
  return {
    activeUsers: Math.floor(Math.random() * 100) + 50,
    revenue: Math.floor(Math.random() * 10000) + 5000,
    ordersToday: Math.floor(Math.random() * 50) + 20,
    stockAlerts: Math.floor(Math.random() * 5),
  };
};

// Utility to generate random chart data
export const generateDemoChartData = () => {
  return {
    timestamp: new Date().toISOString(),
    sales: Math.floor(Math.random() * 1000) + 500,
    visitors: Math.floor(Math.random() * 200) + 100,
  };
};
