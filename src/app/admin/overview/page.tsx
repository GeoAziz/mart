'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Bell,
  Search,
  Filter,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  ExternalLink,
  Loader2,
  CreditCard,
  Smartphone,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, Order, Product } from '@/lib/types';
import Link from 'next/link';
import clsx from 'clsx';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: any;
  isLoading: boolean;
}

function StatTile({
  title,
  value,
  change,
  isPositive,
  icon: Icon,
  isLoading,
}: MetricCardProps) {
  return (
    <div className="bg-card/70 backdrop-blur-md border border-border/70 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-accent/40 transition-all group">
      <div className="flex items-center gap-3.5 mb-3">
        <div className="h-10 w-10 rounded-xl bg-secondary/80 flex items-center justify-center text-foreground group-hover:bg-accent/20 group-hover:text-accent transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        {isLoading ? (
          <div className="h-7 w-20 bg-muted/60 rounded animate-pulse" />
        ) : (
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </span>
        )}
        <div
          className={clsx(
            'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
            isPositive
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{change}</span>
        </div>
      </div>
    </div>
  );
}

// Custom Tooltip for the Saledash-style chart
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 shadow-2xl rounded-xl p-3 text-white min-w-[150px] backdrop-blur-md">
        <p className="text-xs font-semibold text-slate-300 mb-1.5">{label}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center text-accent">
            <span className="text-slate-400">Transactions:</span>
            <span className="font-bold">{data.orders || 0}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span className="text-slate-400">Revenue:</span>
            <span className="font-bold">KSh {(data.sales || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    activeVendors: 0,
    totalRevenue: 0,
  });

  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '12m' | 'all'>('7d');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  const toJSDate = (val: any): Date => {
    if (!val) return new Date(0);
    if (val instanceof Date) return val;
    if (val.toDate && typeof val.toDate === 'function') return val.toDate();
    return new Date(val);
  };

  const fetchData = useCallback(async () => {
    if (!currentUser || userProfile?.role !== 'admin') return;
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, ordersRes, productsRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/orders', { headers }),
        fetch('/api/products?role=admin&limit=100', { headers }),
      ]);

      if (!usersRes.ok || !ordersRes.ok || !productsRes.ok) {
        throw new Error('Failed to fetch dashboard data.');
      }

      const usersData: UserProfile[] = await usersRes.json();
      const ordersData: Order[] = await ordersRes.json();
      const productsPayload = await productsRes.json();
      const productsData: Product[] = productsPayload.products || [];

      setOrders(ordersData);
      setProducts(productsData);

      const completed = ordersData.filter((o) => o.status === 'delivered').length;
      const cancelled = ordersData.filter((o) => o.status === 'cancelled').length;
      const totalRev = ordersData.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const vendors = usersData.filter((u) => u.role === 'vendor').length;

      setStats({
        totalProducts: productsData.length,
        completedOrders: completed,
        cancelledOrders: cancelled,
        activeVendors: vendors,
        totalRevenue: totalRev,
      });
    } catch (error) {
      console.error('Failed to load admin overview:', error);
      toast({
        title: 'Error',
        description: 'Could not load dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, userProfile, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Dynamic greeting based on current time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const adminName = userProfile?.fullName?.split(' ')[0] || 'Jonathan';
  const currentDateStr = format(new Date(), 'dd MMM yyyy');

  // Chart data generation
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = months[d.getMonth()];
      
      const monthOrders = orders.filter((o) => {
        const od = toJSDate(o.createdAt);
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
      });

      const mSales = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      result.push({
        date: mLabel,
        sales: mSales,
        orders: monthOrders.length,
      });
    }
    return result;
  }, [orders]);

  // Filtered orders for table
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const idMatch = o.id.toLowerCase().includes(q);
        const userMatch = (o.userId || '').toLowerCase().includes(q);
        return idMatch || userMatch;
      })
      .slice(0, 7);
  }, [orders, searchQuery]);

  // Top products for spotlight carousel
  const topProducts = useMemo(() => {
    if (products.length === 0) return [];
    return [...products]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);
  }, [products]);

  const activeSpotlight = topProducts[spotlightIndex] || null;

  const toggleSelectOrder = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map((o) => o.id));
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in-50 duration-300">
      {/* 1. TOP HEADER & GREETING BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {greeting}, {adminName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here&apos;s what&apos;s happening across ZilaCart today
          </p>
        </div>

        {/* Top-Right Cluster: Date, Notifications, Store Link */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card border border-border/70 text-xs font-medium text-foreground shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-accent" />
            <span>{currentDateStr}</span>
          </div>

          <Link
            href="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-accent/15 border border-border/70 text-xs font-medium text-muted-foreground hover:text-accent transition-colors"
          >
            <span>Live Store</span>
            <ExternalLink className="h-3 w-3" />
          </Link>

          <button
            type="button"
            className="relative p-2 rounded-xl bg-card border border-border/70 hover:bg-accent/15 hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent animate-pulse" />
          </button>
        </div>
      </div>

      {/* 2. TOP METRIC CARDS ROW (4 Uniform Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          title="Total products"
          value={stats.totalProducts.toLocaleString()}
          change="+2.5%"
          isPositive={true}
          icon={Package}
          isLoading={isLoading}
        />
        <StatTile
          title="Completed orders"
          value={stats.completedOrders.toLocaleString()}
          change="+4.1%"
          isPositive={true}
          icon={CheckCircle2}
          isLoading={isLoading}
        />
        <StatTile
          title="Canceled orders"
          value={stats.cancelledOrders.toLocaleString()}
          change="-1.2%"
          isPositive={false}
          icon={XCircle}
          isLoading={isLoading}
        />
        <StatTile
          title="Active vendors"
          value={stats.activeVendors.toLocaleString()}
          change="+5.0%"
          isPositive={true}
          icon={Users}
          isLoading={isLoading}
        />
      </div>

      {/* 3. SALES REPORT & CHART HERO CARD */}
      <div className="bg-card/70 backdrop-blur-md border border-border/70 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-foreground">Your sales report</h2>
            <p className="text-xs text-muted-foreground">Platform gross merchandise volume</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Timeframe pill selector */}
            <div className="flex items-center p-1 rounded-xl bg-secondary/80 border border-border/60 text-xs font-semibold">
              {(['24h', '7d', '30d', '12m', 'all'] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={clsx(
                    'px-3 py-1 rounded-lg transition-all',
                    timeRange === range
                      ? 'bg-accent text-black font-extrabold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Big Headline Stat */}
        <div className="mb-6">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            KSh {stats.totalRevenue.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center text-xs font-semibold text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              +KSh {(stats.totalRevenue * 0.12).toFixed(0)} (+12.4%)
            </span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-[260px] w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#00f0ff"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGlow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. LOWER SECTION: TRANSACTIONS TABLE (2/3) + SPOTLIGHT SHOWCASE (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Last Transactions Table (8 Cols) */}
        <div className="lg:col-span-8 bg-card/70 backdrop-blur-md border border-border/70 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-bold text-foreground">Last transactions</h3>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-secondary/80 border border-border/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent w-40 sm:w-48 placeholder:text-muted-foreground/60"
                />
              </div>
              <button
                type="button"
                className="p-2 rounded-xl bg-secondary/80 border border-border/60 hover:bg-accent/15 hover:text-accent transition-colors"
                title="Filter transactions"
              >
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        filteredOrders.length > 0 &&
                        selectedOrders.length === filteredOrders.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                  </th>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" />
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No matching transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isSelected = selectedOrders.includes(order.id);
                    return (
                      <tr
                        key={order.id}
                        className={clsx(
                          'hover:bg-accent/5 transition-colors',
                          isSelected && 'bg-accent/10'
                        )}
                      >
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOrder(order.id)}
                            className="rounded border-border text-accent focus:ring-accent"
                          />
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-foreground">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="hover:text-accent hover:underline flex items-center gap-1"
                          >
                            <span>#{order.id.slice(-6).toUpperCase()}</span>
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                              order.status === 'delivered'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : order.status === 'cancelled'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            )}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {format(toJSDate(order.createdAt), 'dd/MM/yyyy')}
                        </td>
                        <td className="py-3 px-3 font-semibold text-foreground">
                          KSh {(order.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {order.paymentMethod === 'mpesa' ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                <Smartphone className="h-3 w-3" /> M-Pesa
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 text-[10px] font-bold">
                                <CreditCard className="h-3 w-3" /> Card / COD
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Spotlight / Best Performers Showcase (4 Cols) */}
        <div className="lg:col-span-4 bg-card/70 backdrop-blur-md border border-border/70 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-foreground font-bold text-base mb-1">
              <span>Top Performers</span>
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground">
              Highest demand products by customer purchases
            </p>

            {/* Spotlight Card Carousel */}
            <div className="my-6 relative flex flex-col items-center">
              {activeSpotlight ? (
                <div className="w-full flex flex-col items-center">
                  <div className="h-40 w-40 rounded-2xl overflow-hidden bg-secondary border border-border/70 shadow-lg flex items-center justify-center relative p-2 group">
                    {activeSpotlight.imageUrl ? (
                      <img
                        src={activeSpotlight.imageUrl}
                        alt={activeSpotlight.name}
                        className="h-full w-full object-contain transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>

                  <div className="text-center mt-4 px-2">
                    <h4 className="text-sm font-bold text-foreground line-clamp-1">
                      {activeSpotlight.name}
                    </h4>
                    <p className="text-xs font-semibold text-accent mt-0.5">
                      KSh {activeSpotlight.price?.toLocaleString()}
                    </p>
                    <span className="inline-block mt-1 text-[11px] font-medium text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
                      ★ {activeSpotlight.rating ? activeSpotlight.rating.toFixed(1) : '5.0'} rating • top rated
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                  No spotlight data available.
                </div>
              )}

              {/* Carousel Controls */}
              {topProducts.length > 1 && (
                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setSpotlightIndex((prev) =>
                        prev === 0 ? topProducts.length - 1 : prev - 1
                      )
                    }
                    className="p-1.5 rounded-full bg-secondary hover:bg-accent/20 hover:text-accent transition-colors"
                    aria-label="Previous product"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    {spotlightIndex + 1} of {topProducts.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSpotlightIndex((prev) =>
                        prev === topProducts.length - 1 ? 0 : prev + 1
                      )
                    }
                    className="p-1.5 rounded-full bg-secondary hover:bg-accent/20 hover:text-accent transition-colors"
                    aria-label="Next product"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border/60 pt-3">
            <Link
              href="/admin/products"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-bold transition-colors"
            >
              <span>Manage All Products</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
