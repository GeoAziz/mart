'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle } from 'lucide-react';

interface InventoryAlert {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

interface InventoryUpdate {
  timestamp: string;
  product: string;
  oldQuantity: number;
  newQuantity: number;
  type: 'restock' | 'sale' | 'adjustment';
}

export const RealTimeInventory = () => {
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<InventoryUpdate[]>([]);

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'inventory_alert') {
        setInventoryAlerts(prev => [...prev, data.alert].slice(-5)); // Keep last 5 alerts
      } else if (data.type === 'inventory_update') {
        setRecentUpdates(prev => [...prev, data.update].slice(-10)); // Keep last 10 updates
      }
    };

    return () => ws.close();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Real-Time Inventory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {inventoryAlerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Low Stock Alerts</h3>
            {inventoryAlerts.map((alert, index) => (
              <Alert key={index} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {alert.productName} - {alert.currentStock} units left
                  <Badge className="ml-2" variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <div>
          <h3 className="font-semibold mb-2">Recent Updates</h3>
          <div className="space-y-2">
            {recentUpdates.map((update, index) => (
              <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded-lg">
                <span>{update.product}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {update.oldQuantity} → {update.newQuantity}
                  </span>
                  <Badge variant={
                    update.type === 'restock' ? 'secondary' :
                    update.type === 'sale' ? 'default' : 'outline'
                  }>
                    {update.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
