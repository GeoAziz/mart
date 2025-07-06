import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SalesMetric } from '@/lib/types/analytics';

interface SalesChartProps {
  data: SalesMetric[];
  title?: string;
  description?: string;
}

export function SalesChart({ data, title = "Sales Performance", description = "Daily revenue and units sold over time" }: SalesChartProps) {
  const CHART_COLORS = ['#2563eb', '#7c3aed'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                }}
              />
              <Legend />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="revenue" 
                name="Revenue (KSh)" 
                stroke={CHART_COLORS[0]} 
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="units" 
                name="Units Sold" 
                stroke={CHART_COLORS[1]} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
