import { WebSocketClient, handleConnection, startHeartbeat, broadcastMessage, generateDemoMetrics, generateDemoChartData } from '@/lib/websocket';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3001 });
const clients: Set<WebSocketClient> = new Set();

wss.on('connection', (ws: WebSocketClient) => {
  handleConnection(ws, clients);
  console.log('New client connected');
});

// Start the heartbeat
startHeartbeat(clients);

// Simulate real-time data updates
setInterval(() => {
  if (clients.size > 0) {
    // Send metrics update
    broadcastMessage(clients, {
      type: 'metrics_update',
      payload: {
        metrics: generateDemoMetrics()
      }
    });

    // Send chart data
    broadcastMessage(clients, {
      type: 'chart_data',
      payload: {
        chartData: generateDemoChartData()
      }
    });

    // Randomly send notifications
    if (Math.random() > 0.7) {
      broadcastMessage(clients, {
        type: 'notification',
        payload: {
          id: Date.now().toString(),
          type: 'sale',
          message: 'New sale completed!',
          severity: 'success',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Randomly send inventory alerts
    if (Math.random() > 0.9) {
      broadcastMessage(clients, {
        type: 'inventory_alert',
        payload: {
          productId: '123',
          productName: 'Sample Product',
          currentStock: 5,
          threshold: 10,
          severity: 'warning'
        }
      });
    }
  }
}, 5000); // Update every 5 seconds

console.log('WebSocket server running on port 3001');
