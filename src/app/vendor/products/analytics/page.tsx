'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Package, TrendingUp, Layers, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';

// Analytics interfaces
interface ProductAnalytics {
  salesPerformance: SalesMetric[];
  popularityMetrics: PopularityMetric[];
  inventoryTurnover: InventoryMetric[];
  categoryPerformance: CategoryMetric[];
  topProducts: TopProduct[];
}

interface SalesMetric {
  date: string;
  revenue: number;
  units: number;
}

interface PopularityMetric {
  productId: string;
  name: string;
  views: number;
  conversionRate: number;
}

interface InventoryMetric {
  productId: string;
  name: string;
  turnoverRate: number;
  daysInStock: number;
}

interface CategoryMetric {
  category: string;
  revenue: number;
  percentage: number;
}

interface TopProduct {
  id: string;
  name: string;
  revenue: number;
  units: number;
}

const StatCard = ({ title, value, icon, description }: { title: string; value: string; icon: React.ReactNode; description?: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </CardContent>
  </Card>
);

// Color constants for charts
const CHART_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#84cc16', '#06b6d4'];

export default function ProductAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/vendor/me/products/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            No Data Available
          </CardTitle>
          <CardDescription>
            We couldn't load the analytics data. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate total revenue and units
  const totalRevenue = analytics.salesPerformance.reduce((sum, day) => sum + day.revenue, 0);
  const totalUnits = analytics.salesPerformance.reduce((sum, day) => sum + day.units, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`KSh ${totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          description="Total revenue from all products"
        />
        <StatCard
          title="Units Sold"
          value={totalUnits.toLocaleString()}
          icon={<Package className="h-4 w-4 text-primary" />}
          description="Total units sold across all products"
        />
        <StatCard
          title="Top Performing Category"
          value={analytics.categoryPerformance[0]?.category || 'N/A'}
          icon={<Layers className="h-4 w-4 text-primary" />}
          description={`${analytics.categoryPerformance[0]?.percentage.toFixed(1)}% of total revenue`}
        />
        <StatCard
          title="Best Seller"
          value={analytics.topProducts[0]?.name || 'N/A'}
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          description={`${analytics.topProducts[0]?.units || 0} units sold`}
        />
      </div>

      {/* Sales Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Performance</CardTitle>
          <CardDescription>Daily revenue and units sold over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.salesPerformance}>
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
                <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (KSh)" stroke={CHART_COLORS[0]} />
                <Line yAxisId="right" type="monotone" dataKey="units" name="Units Sold" stroke={CHART_COLORS[1]} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Category Performance</CardTitle>
          <CardDescription>Revenue distribution across product categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.categoryPerformance}
                  dataKey="revenue"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {analytics.categoryPerformance.map((entry, index) => (
                    <Cell key={entry.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `KSh ${value.toLocaleString()}`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Turnover Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Turnover Analysis</CardTitle>
          <CardDescription>Product turnover rates and days in stock</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.inventoryTurnover}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Legend />
                <Bar dataKey="turnoverRate" name="Turnover Rate" fill={CHART_COLORS[2]} />
                <Bar dataKey="daysInStock" name="Days in Stock" fill={CHART_COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Product Popularity */}
      <Card>
        <CardHeader>
          <CardTitle>Product Popularity</CardTitle>
          <CardDescription>Views and conversion rates by product</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.popularityMetrics}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="views" name="Views" fill={CHART_COLORS[4]} />
                <Bar yAxisId="right" dataKey="conversionRate" name="Conversion Rate (%)" fill={CHART_COLORS[5]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}