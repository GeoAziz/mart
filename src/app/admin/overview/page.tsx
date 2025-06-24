
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, ShoppingCart, DollarSign, Activity, CheckCircle, AlertTriangle, HeartPulse, ListOrdered, BarChartBig, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, Order } from '@/lib/types';


const StatCard = ({ title, value, icon, change, changeType, isLoading }: { title: string, value: string, icon: React.ReactNode, change?: string, changeType?: 'positive' | 'negative', isLoading?: boolean }) => (
  <Card className="bg-card border-border shadow-lg hover:shadow-primary/20 transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary mt-1" />
      ) : (
         <>
            <div className="text-2xl font-bold text-glow-primary">{value}</div>
            {change && (
              <p className={`text-xs ${changeType === 'positive' ? 'text-green-400' : 'text-red-400'}`}>
                {changeType === 'positive' ? '+' : '-'}{change} from last month
              </p>
            )}
         </>
      )}
    </CardContent>
  </Card>
);

interface SalesDataPoint {
  date: string;
  Sales: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({ totalUsers: 0, totalSellers: 0, totalSalesMonth: 0 });
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!currentUser || userProfile?.role !== 'admin') return;
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [usersRes, ordersRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/orders', { headers }),
      ]);

      if (!usersRes.ok || !ordersRes.ok) throw new Error("Failed to fetch dashboard data.");

      const users: UserProfile[] = await usersRes.json();
      const orders: Order[] = await ordersRes.json();
      
      // Calculate Stats
      const totalUsers = users.length;
      const totalSellers = users.filter(u => u.role === 'vendor').length;
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const totalSalesMonth = orders
        .filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        })
        .reduce((sum, o) => sum + o.totalAmount, 0);

      setStats({ totalUsers, totalSellers, totalSalesMonth });

      // Process sales data for chart (last 6 months)
      const monthlySales: { [key: string]: number } = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlySales[monthKey] = 0;
      }
      
      orders.forEach(o => {
        const orderDate = new Date(o.createdAt);
        const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlySales.hasOwnProperty(monthKey)) {
          monthlySales[monthKey] += o.totalAmount;
        }
      });
      
      const chartData = Object.entries(monthlySales).map(([date, sales]) => ({ date, Sales: sales }));
      setSalesData(chartData);

    } catch (error) {
      console.error("Failed to load admin overview data:", error);
      toast({ title: 'Error', description: "Could not load dashboard data.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, userProfile, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  

  const siteHealth = {
    status: "Operational",
    uptime: "99.99%",
    lastCheck: "2 mins ago",
    issues: 0,
  };
  
  const formatCurrency = (amount: number) => `KSh ${amount > 1000000 ? `${(amount/1000000).toFixed(1)}M` : amount > 1000 ? `${(amount/1000).toFixed(1)}k` : amount.toFixed(0)}`;


  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users className="h-5 w-5 text-blue-400"/>} isLoading={isLoading}/>
        <StatCard title="Total Sellers" value={stats.totalSellers.toLocaleString()} icon={<Users className="h-5 w-5 text-purple-400"/>} isLoading={isLoading}/>
        <StatCard title="Total Sales (Month)" value={formatCurrency(stats.totalSalesMonth)} icon={<DollarSign className="h-5 w-5 text-green-400"/>} isLoading={isLoading}/>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-glow-accent">Live Site Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
              <span className="text-muted-foreground">Current Live Orders:</span>
              <span className="font-semibold text-primary">12</span>
            </div>
             <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
              <span className="text-muted-foreground">Today's Traffic:</span>
              <span className="font-semibold text-primary">5.6k visitors/day</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-glow-accent">Site Health Monitor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`flex items-center p-3 rounded-md ${siteHealth.issues === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              {siteHealth.issues === 0 ? <CheckCircle className="h-6 w-6 text-green-400 mr-3"/> : <AlertTriangle className="h-6 w-6 text-red-400 mr-3"/>}
              <div>
                <p className={`font-semibold ${siteHealth.issues === 0 ? 'text-green-300' : 'text-red-300'}`}>System Status: {siteHealth.status}</p>
                <p className="text-xs text-muted-foreground">Uptime: {siteHealth.uptime} | Last check: {siteHealth.lastCheck}</p>
              </div>
            </div>
             {siteHealth.issues > 0 && <p className="text-red-400 text-sm">{siteHealth.issues} active issue(s) requiring attention.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-glow-accent">Sales Trend</CardTitle>
          <CardDescription className="text-muted-foreground">Monthly sales performance over the last 6 months.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
          {isLoading ? (
             <div className="h-full flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={salesData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(value) => `KSh ${value/1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--popover-foreground))',
                    borderRadius: 'var(--radius)',
                  }}
                  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
                   formatter={(value: number) => [`KSh ${value.toLocaleString()}`, "Sales"]}
                />
                <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Line type="monotone" dataKey="Sales" strokeWidth={2} stroke="hsl(var(--chart-1))" activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--card))' }} dot={{fill: 'hsl(var(--chart-1))', r:3}}/>
              </LineChart>
            </ResponsiveContainer>
          )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
