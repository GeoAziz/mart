'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import EmptyState from '@/components/ui/empty-state';
import MotionCard from '@/components/ui/motion-card';
import { Users, ShoppingCart, DollarSign, Activity, CheckCircle, AlertTriangle, HeartPulse, ListOrdered, BarChartBig, Loader2, ShoppingBag, Mail } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import Breadcrumb from '@/components/ui/breadcrumb';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, Order, Product } from '@/lib/types';


const StatCard = ({ title, value, icon, change, changeType, isLoading }: { title: string, value: string, icon: React.ReactNode, change?: string, changeType?: 'positive' | 'negative', isLoading?: boolean }) => (
  <Card isLoading={isLoading} className="bg-card border-border shadow-lg hover:shadow-primary/20 transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    {!isLoading && (
      <CardContent>
        <div className="text-2xl font-bold text-glow-primary">{value}</div>
        {change && (
          <p className={`text-xs ${changeType === 'positive' ? 'text-green-400' : 'text-red-400'}`}>
            {changeType === 'positive' ? '+' : '-'}{change} from last month
          </p>
        )}
      </CardContent>
    )}
  </Card>
);

interface SalesDataPoint {
  date: string;
  Sales: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({ totalUsers: 0, totalSellers: 0, totalSalesMonth: 0, liveOrders: 0 });
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!currentUser || userProfile?.role !== 'admin') return;
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [usersRes, ordersRes, productsRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/orders', { headers }),
        fetch('/api/products?role=admin&limit=100', { headers }),
      ]);

      if (!usersRes.ok || !ordersRes.ok || !productsRes.ok) throw new Error("Failed to fetch dashboard data.");

      const users: UserProfile[] = await usersRes.json();
      const orders: Order[] = await ordersRes.json();
      const productsData = await productsRes.json();
      const products: Product[] = productsData.products || [];
      
      // Calculate Stats
      const totalUsers = users.length;
      const totalSellers = users.filter(u => u.role === 'vendor').length;
      const liveOrders = orders.filter(o => o.status === 'processing' || o.status === 'pending').length;
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Helper to robustly convert Firestore Timestamp or Date to JS Date
      function toJSDate(val: any): Date {
        if (!val) return new Date(0);
        if (val instanceof Date) return val;
        if (val.toDate && typeof val.toDate === 'function') return val.toDate();
        return new Date(val);
      }

      const totalSalesMonth = orders
        .filter(o => {
            const orderDate = toJSDate(o.createdAt);
            return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        })
        .reduce((sum, o) => sum + o.totalAmount, 0);

      setStats({ totalUsers, totalSellers, totalSalesMonth, liveOrders });

      // Recent Orders
      const recent = [...orders]
        .sort((a, b) => toJSDate(b.createdAt).getTime() - toJSDate(a.createdAt).getTime())
        .slice(0, 5);
      setRecentOrders(recent);

      // Low Stock Products
      const lowStockList = products
        .filter(p => p.stock !== undefined && p.stock < 10)
        .sort((a, b) => (a.stock || 0) - (b.stock || 0))
        .slice(0, 5);
      setLowStock(lowStockList);

      // Process sales data for chart (last 6 months)
      const monthlySales: { [key: string]: number } = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlySales[monthKey] = 0;
      }
      
      orders.forEach(o => {
        const orderDate = toJSDate(o.createdAt);
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

  function toJSDate(val: any): Date {
    if (!val) return new Date(0);
    if (val instanceof Date) return val;
    if (val.toDate && typeof val.toDate === 'function') return val.toDate();
    return new Date(val);
  }

  return (
    <div className="space-y-8">
    <Breadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Overview', href: '/admin/overview' }]} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MotionCard className="bg-card border-border shadow-lg hover:shadow-primary/20 transition-shadow p-0">
          <div className="p-4">
            <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users className="h-5 w-5 text-blue-400"/>} isLoading={isLoading}/>
          </div>
        </MotionCard>
        <MotionCard className="bg-card border-border shadow-lg hover:shadow-primary/20 transition-shadow p-0">
          <div className="p-4">
            <StatCard title="Total Sellers" value={stats.totalSellers.toLocaleString()} icon={<Users className="h-5 w-5 text-purple-400"/>} isLoading={isLoading}/>
          </div>
        </MotionCard>
        {stats.totalSalesMonth === 0 && !isLoading ? (
          <MotionCard className="bg-card border-border shadow-lg hover:shadow-primary/20 transition-shadow p-0">
            <div className="p-4">
              <EmptyState title="No sales this month" description="You have no sales recorded for this month. Try approving pending products or promoting listings." action={{ label: 'View Pending Products', href: '/admin/products?filter=pending'}} />
            </div>
          </MotionCard>
        ) : (
          <MotionCard className="bg-card border-border shadow-lg hover:shadow-primary/20 transition-shadow p-0">
            <div className="p-4">
              <StatCard title="Total Sales (Month)" value={formatCurrency(stats.totalSalesMonth)} icon={<DollarSign className="h-5 w-5 text-green-400"/>} isLoading={isLoading}/>
            </div>
          </MotionCard>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-glow-accent">Live Site Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
              <span className="text-muted-foreground">Current Live Orders:</span>
              <span className="font-semibold text-primary">{isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : stats.liveOrders}</span>
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
             <div className="h-full flex justify-center items-center"><div className="h-full w-full skeleton-shimmer"/></div>
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
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(val: string) => {
                    // val is YYYY-MM -> convert to short month
                    try {
                      const parsed = parseISO(val + '-01');
                      return format(parsed, 'MMM yy');
                    } catch (e) {
                      return val;
                    }
                  }}
                />
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
                   formatter={(value: number) => [`KSh ${value.toLocaleString()}`, 'Sales']}
                  labelFormatter={(label: string) => {
                    try {
                      const parsed = parseISO(label + '-01');
                      return format(parsed, 'LLLL yyyy');
                    } catch (e) {
                      return label;
                    }
                  }}
                />
                <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Line type="monotone" dataKey="Sales" strokeWidth={2} stroke="hsl(var(--chart-1))" activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--card))' }} dot={{fill: 'hsl(var(--chart-1))', r:3}}/>
              </LineChart>
            </ResponsiveContainer>
          )}
          </div>
        </CardContent>
      </Card>
      {/* Recent Orders Table */}
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <ListOrdered className="mr-2 h-5 w-5 text-primary" /> Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">No recent orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left">Order ID</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Total</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-primary/5 transition-all">
                      <td className="px-4 py-2 font-mono">{order.id.slice(-6)}</td>
                      <td className="px-4 py-2">{format(toJSDate(order.createdAt), 'yyyy-MM-dd')}</td>
                      <td className="px-4 py-2">KSh {order.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs border ${
                          order.status === 'delivered' ? 'bg-green-500/20 text-green-300 border-green-400' :
                          order.status === 'cancelled' ? 'bg-red-500/20 text-red-300 border-red-400' :
                          'bg-blue-500/20 text-blue-300 border-blue-400'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Inventory List */}
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <ShoppingBag className="mr-2 h-5 w-5 text-primary" /> Low Stock Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
          ) : lowStock.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">No low stock items found.</div>
          ) : (
            <ul className="space-y-2">
              {lowStock.map(product => (
                <li key={product.id} className="flex items-center gap-2">
                  <span className="font-semibold flex-1">{product.name}</span>
                  <span className="text-xs text-muted-foreground mr-2">Stock: {product.stock}</span>
                  <span className={`border rounded px-2 py-1 ml-2 text-xs ${
                    product.stock === 0 ? 'bg-red-500/20 text-red-300 border-red-400' : 'bg-yellow-500/20 text-yellow-300 border-yellow-400'
                  }`}>
                    {product.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Newsletter Signup Count */}
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <Mail className="mr-2 h-5 w-5 text-primary" /> Newsletter Signups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">1,234</div>
          <div className="text-muted-foreground">Total email captures (Mock)</div>
        </CardContent>
      </Card>
    </div>
  );
}
