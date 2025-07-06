import * as tf from '@tensorflow/tfjs';
import { format } from 'date-fns';
import { WebSocket, WebSocketServer } from 'ws';
import NodeCache from 'node-cache';

// Cache for storing analytics data
const analyticsCache = new NodeCache({ stdTTL: 3600 }); // 1 hour default TTL

interface ExportFormat {
  csv: 'csv';
  json: 'json';
  xlsx: 'xlsx';
}

interface AnalyticsData {
  timestamp: number;
  metrics: {
    sales: number;
    revenue: number;
    visitors: number;
    [key: string]: number;
  };
}

function shouldStartWebSocketServer() {
  // Only start in dev or if explicitly enabled, and not in Vercel/Next.js build
  return (
    typeof process !== 'undefined' &&
    process.env.NODE_ENV !== 'production' &&
    !process.env.NEXT_RUNTIME &&
    !process.env.VERCEL &&
    !process.env.NEXT_PUBLIC_VERCEL_ENV
  );
}

export class IntegrationService {
  private wsClients: Set<WebSocket> = new Set();
  private dataQueue: AnalyticsData[] = [];
  private wss: WebSocketServer | null = null;
  private wsStarted: boolean = false;

  constructor() {
    if (shouldStartWebSocketServer()) {
      this.initializeWebSocket();
    }
  }

  private initializeWebSocket() {
    if (this.wsStarted) return;
    try {
      this.wss = new WebSocketServer({ port: 8080 });
      this.wsStarted = true;
      this.wss.on('connection', (ws) => {
        this.wsClients.add(ws);
        ws.on('close', () => {
          this.wsClients.delete(ws);
        });
      });
      // eslint-disable-next-line no-console
      console.log('[IntegrationService] WebSocket server started on port 8080');
    } catch (err: any) {
      if (err.code === 'EADDRINUSE') {
        // eslint-disable-next-line no-console
        console.warn('[IntegrationService] WebSocket port 8080 already in use. Skipping server start.');
      } else {
        // eslint-disable-next-line no-console
        console.error('[IntegrationService] Failed to start WebSocket server:', err);
      }
      this.wss = null;
    }
  }

  // Data Export Functions
  async exportData(format: keyof ExportFormat, startDate: Date, endDate: Date) {
    const data = await this.fetchDataForRange(startDate, endDate);
    
    switch (format) {
      case 'csv':
        return this.exportToCSV(data);
      case 'json':
        return this.exportToJSON(data);
      case 'xlsx':
        return this.exportToExcel(data);
      default:
        throw new Error('Unsupported export format');
    }
  }

  private exportToCSV(data: AnalyticsData[]): string {
    const headers = ['timestamp', 'sales', 'revenue', 'visitors'];
    const rows = data.map(row => [
      new Date(row.timestamp).toISOString(),
      row.metrics.sales,
      row.metrics.revenue,
      row.metrics.visitors
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  private exportToJSON(data: AnalyticsData[]): string {
    return JSON.stringify(data, null, 2);
  }

  private exportToExcel(data: AnalyticsData[]): Buffer {
    // Implementation would use a library like 'xlsx'
    throw new Error('Excel export not implemented');
  }

  // Data Import Functions
  async importData(data: AnalyticsData[], source: string) {
    try {
      this.validateImportData(data);
      analyticsCache.set(`import_${source}_${Date.now()}`, data);
      this.broadcastUpdate({
        type: 'import',
        source,
        count: data.length
      });
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  private validateImportData(data: AnalyticsData[]) {
    if (!Array.isArray(data)) throw new Error('Data must be an array');
    for (const item of data) {
      if (typeof item.timestamp !== 'number' || typeof item.metrics !== 'object') {
        throw new Error('Invalid analytics data format');
      }
    }
  }

  // Real-time Updates
  private broadcastUpdate(message: any) {
    if (!this.wss) return;
    const msg = JSON.stringify(message);
    for (const ws of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  }

  // Placeholder for fetchDataForRange
  private async fetchDataForRange(startDate: Date, endDate: Date): Promise<AnalyticsData[]> {
    // Implement actual data fetching logic here
    return [];
  }

  // Optionally, add connectToThirdParty and createCustomReport stubs for API completeness
  async connectToThirdParty(provider: string, credentials: any) {
    // Implement connection logic
    return { connected: true, provider };
  }

  async createCustomReport(config: any) {
    // Implement custom report logic
    return { report: 'Custom report data' };
  }
}

export const integrationService = new IntegrationService();
