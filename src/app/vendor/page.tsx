
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DollarSign, Package, ShoppingCart, Users, TrendingUp, BarChart3, AlertCircle, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';


interface EarningsSummary {
  totalAllTimeEarnings: number;
  currentBalance: number;
  lastPayoutAmount: number | null;
  lastPayoutDate: string | null;
  earningsChartData: { month: string; earnings: number }[];
}

const StatCard = ({ title, value, icon, isLoading }: { title: string, value: string, icon: React.ReactNode, isLoading?: boolean }) => (
  <Card className="bg-card border-border shadow-lg hover:shadow-primary/20 transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {isLoading ? (
         <Loader2 className="h-6 w-6 animate-spin text-primary mt-1" />
      ) : (
        <div className="text-2xl font-bold text-glow-primary">{value}</div>
      )}
    </CardContent>
  </Card>
);


export default function VendorDashboardPage() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const headers = { 'Authorization': `Bearer ${token}` };

      const [summaryRes, ordersRes] = await Promise.all([
        fetch('/api/vendors/me/earnings-summary', { headers }),
        fetch('/api/orders', { headers })
      ]);
      
      if (!summaryRes.ok) throw new Error((await summaryRes.json()).message || 'Failed to fetch earnings summary.');
      if (!ordersRes.ok) throw new Error((await ordersRes.json()).message || 'Failed to fetch orders.');

      const summaryData: EarningsSummary = await summaryRes.json();
      const ordersData: Order[] = await ordersRes.json();
      
      setSummary(summaryData);
      setRecentOrders(ordersData.slice(0, 5)); // Get last 5 orders

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      const errorMessage = err instanceof Error ? err.message : "Could not load dashboard data.";
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return `KSh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue (Net)" value={formatCurrency(summary?.totalAllTimeEarnings)} icon={<DollarSign className="h-5 w-5 text-green-400"/>} isLoading={isLoading}/>
        <StatCard title="Available for Payout" value={formatCurrency(summary?.currentBalance)} icon={<ShoppingCart className="h-5 w-5 text-blue-400"/>} isLoading={isLoading} />
        {/* Placeholder stats, can be made dynamic later */}
        <StatCard title="Active Products" value="75" icon={<Package className="h-5 w-5 text-purple-400"/>} />
        <StatCard title="New Customers" value="42" icon={<Users className="h-5 w-5 text-orange-400"/>} />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-glow-accent flex items-center">
                 <BarChart3 className="mr-3 h-5 w-5 text-accent" /> Sales Performance
            </CardTitle>
            <CardDescription className="text-muted-foreground">Your net earnings over recent months</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                 <div className="h-[300px] flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
            ) : error || !summary || summary.earningsChartData.length === 0 ? (
                 <div className="h-[300px] flex flex-col justify-center items-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mb-4"/>
                    <p>{error ? "Could not load chart data." : "No earnings data yet to display a chart."}</p>
                </div>
            ) : (
             <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={summary.earningsChartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(value) => `KSh ${value/1000}k`} />
                    <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 'var(--radius)'}}
                    itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
                    formatter={(value: number) => [formatCurrency(value), "Net Earnings"]}
                    />
                    <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="earnings" stroke="hsl(var(--chart-1))" strokeWidth={2} activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--card))' }} dot={{fill: 'hsl(var(--chart-1))', r:3}}/>
                </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-headline text-glow-accent">Recent Orders</CardTitle>
            <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              <Link href="/vendor/orders/all">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
            ) : recentOrders.length > 0 ? (
                <ul className="space-y-3">
                {recentOrders.map(order => (
                    <li key={order.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <div>
                            <Link href={`/vendor/orders/${order.id}`} className="font-medium hover:underline text-foreground">Order #{order.id?.substring(0, 7)}...</Link>
                            <p className="text-xs text-muted-foreground">{order.userFullName} - {new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-primary">{formatCurrency(order.totalAmount)}</p>
                            <p className="text-xs text-muted-foreground capitalize">{order.status}</p>
                        </div>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="text-muted-foreground text-center py-10">No recent orders found.</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl font-headline text-glow-accent">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"><Link href="/vendor/products/add">Add New Product</Link></Button>
            <Button variant="outline" asChild className="border-accent text-accent hover:bg-accent hover:text-accent-foreground w-full"><Link href="/vendor/orders/incoming">Manage Incoming Orders</Link></Button>
            <Button variant="outline" asChild className="border-muted-foreground text-muted-foreground hover:bg-muted hover:text-foreground w-full"><Link href="/vendor/earnings">View Earnings</Link></Button>
            <Button variant="outline" asChild className="border-muted-foreground text-muted-foreground hover:bg-muted hover:text-foreground w-full"><Link href="/vendor/settings">Store Settings</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
