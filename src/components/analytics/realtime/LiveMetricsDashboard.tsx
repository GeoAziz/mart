'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart } from '@/components/ui/chart';
// import { LineChart } from '@/components/ui/line-chart'; // Make sure this path is correct or adjust as needed
import { LineChart } from '@/components/ui/chart'; // Using the existing chart component
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign,
  ShoppingCart,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface MetricCard {
  title: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
  icon: React.ReactNode;
}

interface ChartData {
  timestamp: string;
  sales: number;
  visitors: number;
}

interface LiveMetricsProps {
  data: {
    sales: MetricCard;
    orders: MetricCard;
    visitors: MetricCard;
    conversion: MetricCard;
  };
}

export const LiveMetricsDashboard: React.FC<LiveMetricsProps> = ({ data }) => {
  const [metrics, setMetrics] = useState<MetricCard[]>([
    { title: 'Active Users', value: 0, trend: 'stable', percentageChange: 0, icon: <Users className="w-5 h-5" /> },
    { title: 'Live Revenue', value: 0, trend: 'stable', percentageChange: 0, icon: <DollarSign className="w-5 h-5" /> },
    { title: 'Orders Today', value: 0, trend: 'stable', percentageChange: 0, icon: <ShoppingCart className="w-5 h-5" /> },
    { title: 'Stock Alerts', value: 0, trend: 'stable', percentageChange: 0, icon: <Package className="w-5 h-5" /> },
  ]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'metrics_update') {
        setMetrics(data.metrics);
      } else if (data.type === 'chart_data') {
        setChartData(prev => {
          const newData = [...prev, data.chartData];
          if (newData.length > 20) newData.shift(); // Keep last 20 data points
          return newData;
        });
      }
    };

    return () => ws.close();
  }, []);

  const getTrendBadge = (trend: MetricCard['trend']) => {
    const variants = {
      up: 'outline',
      down: 'destructive',
      stable: 'secondary'
    } as const;

    return <Badge variant={variants[trend]}>{trend}</Badge>;
  };

  const formatValue = (value: number): string => {
    return value.toLocaleString('en-US');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <div className="flex items-center gap-2">
                    {metric.icon}
                    <p className="text-2xl font-bold">
                      {metric.title.includes('Revenue') ? '$' : ''}
                      {metric.value.toLocaleString()}
                    </p>
                  </div>
                </div>
                {getTrendBadge(metric.trend)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Live Sales & Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <LineChart
                data={chartData}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Top Selling Products (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <BarChart
                data={[
                  { name: 'Product A', value: 123 },
                  { name: 'Product B', value: 89 },
                  { name: 'Product C', value: 56 },
                  { name: 'Product D', value: 45 },
                  { name: 'Product E', value: 34 },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
