'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { ArrowUpIcon, ArrowDownIcon, DollarSign } from 'lucide-react';

interface SalesData {
  timestamp: string;
  amount: number;
}

export const LiveSalesTracker = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [salesTrend, setSalesTrend] = useState<'up' | 'down' | 'stable'>('stable');

  useEffect(() => {
    // Set up WebSocket connection for live sales
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'sale') {
        setSalesData(prev => {
          const newData = [...prev, { timestamp: new Date().toISOString(), amount: data.amount }];
          if (newData.length > 20) newData.shift(); // Keep last 20 data points
          return newData;
        });
        setTotalSales(prev => prev + data.amount);
        // Update trend
        setSalesTrend(data.trend);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Live Sales
          <Badge variant={salesTrend === 'up' ? 'default' : salesTrend === 'down' ? 'destructive' : 'secondary'}>
            {salesTrend === 'up' ? <ArrowUpIcon className="w-4 h-4" /> : 
             salesTrend === 'down' ? <ArrowDownIcon className="w-4 h-4" /> : null}
            {salesTrend.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <LineChart
            data={salesData}
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Sales Today</span>
          <span className="text-2xl font-bold flex items-center">
            <DollarSign className="w-5 h-5 mr-1" />
            {totalSales.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
