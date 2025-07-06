import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfiguration } from '@/lib/types/analytics';

interface DynamicChartProps {
  data: any[];
  config: ChartConfiguration;
}

export function DynamicChart({ data, config }: DynamicChartProps) {
  const CHART_COLORS = config.colors || ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#84cc16', '#06b6d4'];

  const renderChart = () => {
    switch (config.type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={config.dataKeys[0]} stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
              }}
            />
            <Legend />
            {config.dataKeys.slice(1).map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={config.dataKeys[0]} stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
              }}
            />
            <Legend />
            {config.dataKeys.slice(1).map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                stackId={config.stacked ? "stack" : undefined}
              />
            ))}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={config.dataKeys[1]}
              nameKey={config.dataKeys[0]}
              cx="50%"
              cy="50%"
              outerRadius={150}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => value.toLocaleString()}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
              }}
            />
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={config.dataKeys[0]} stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
              }}
            />
            <Legend />
            {config.dataKeys.slice(1).map((key, index) => (
              <Scatter
                key={key}
                name={key}
                data={data}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </ScatterChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={config.dataKeys[0]} stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
              }}
            />
            <Legend />
            {config.dataKeys.slice(1).map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                stackId={config.stacked ? "stack" : undefined}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="hsl(var(--muted-foreground))" />
            <PolarAngleAxis dataKey={config.dataKeys[0]} stroke="hsl(var(--muted-foreground))" />
            <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
            {config.dataKeys.slice(1).map((key, index) => (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                fillOpacity={0.3}
              />
            ))}
            <Legend />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
              }}
            />
          </RadarChart>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        {config.description && <CardDescription>{config.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart() ?? <></>}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
