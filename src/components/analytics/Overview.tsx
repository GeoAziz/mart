'use client';

import { format } from 'date-fns'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface OverviewProps {
  data: {
    date: string;
    revenue: number;
  }[];
}

export function Overview({ data }: OverviewProps) {
  const formatXAxis = (value: string) => {
    try {
      const d = new Date(value)
      return format(d, 'MMM')
    } catch (e) {
      return value
    }
  }

  const formatCurrency = (value: number) => {
    return `KSh ${Number(value).toLocaleString()}`
  }

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>
          Revenue overview for the selected period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} role="img" aria-label="Revenue area chart">
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={formatXAxis}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => `${value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--popover-foreground))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label: string) => {
                  try {
                    const d = new Date(label)
                    return format(d, 'PP')
                  } catch (e) {
                    return label
                  }
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fill="url(#gradient)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--chart-1))' }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--card))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
