'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Wifi,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Download,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { ErrorState } from '@/components/states/ErrorState';
import { cn } from '@/lib/utils';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
}

export default function VendorDashboardPage() {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    data: null,
    isLoading: true,
    error: null,
  });
  const [chartPeriod, setChartPeriod] = useState<'monthly' | 'annually'>('monthly');
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser) {
        setDashboardState((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/vendors/me/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to load dashboard data');
        }

        const data = await response.json();
        setDashboardState({
          data,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Dashboard loading error:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load dashboard data';
        setDashboardState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        toast({
          title: 'Error loading dashboard',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    };

    loadDashboardData();
  }, [currentUser, toast]);

  const { data, isLoading, error } = dashboardState;

  // Monthly order velocity data formatted for capsule bars
  const velocityData = useMemo(() => {
    if (data?.earningsChartData && data.earningsChartData.length > 0) {
      return data.earningsChartData.map((d: any) => ({
        name: d.month || 'Mo',
        amount: d.earnings || 0,
        orders: d.orders || Math.round((d.earnings || 1000) / 1500),
      }));
    }
    // High-fidelity fallback preview months
    return [
      { name: 'Jan', amount: 18400, orders: 12 },
      { name: 'Feb', amount: 32000, orders: 24 },
      { name: 'Mar', amount: 26500, orders: 19 },
      { name: 'Apr', amount: 54200, orders: 42, isHighlight: true },
      { name: 'May', amount: 39800, orders: 31 },
      { name: 'Jun', amount: 48900, orders: 36 },
    ];
  }, [data]);

  // Peak month identifier
  const peakIndex = useMemo(() => {
    let max = 0;
    let idx = 0;
    velocityData.forEach((item: any, i: number) => {
      if (item.amount > max) {
        max = item.amount;
        idx = i;
      }
    });
    return idx;
  }, [velocityData]);

  // Sparkline data for net revenue wave
  const sparklineData = useMemo(() => {
    return [
      { v: 12 }, { v: 19 }, { v: 15 }, { v: 28 }, { v: 22 }, { v: 34 },
      { v: 30 }, { v: 45 }, { v: 38 }, { v: 52 }, { v: 48 }, { v: 61 }
    ];
  }, []);

  const formatKsh = (amount?: number | null) => {
    if (amount === null || amount === undefined) return 'KSh 0.00';
    return `KSh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const vendorName = userProfile?.fullName || 'Vendor';

  if (error) {
    return (
      <div className="py-12">
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner matching "Welcome Back, Sujon" */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome Back, <span className="text-emerald-400">{vendorName}</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Here is what&apos;s happening with your store and payouts today.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Date Range Selector Pill */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card/75 backdrop-blur-xl border border-border/80 text-xs font-medium shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <span>Last 30 Days</span>
          </div>

          {/* Quick Primary Action */}
          <Link href="/vendor/products/add">
            <Button className="h-9 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs shadow-lg shadow-emerald-500/25 gap-1.5 transition-all hover:scale-[1.02]">
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Top Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column (4 cols on lg): Emerald Wallet Card & Weekly Revenue */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card A: Emerald Payout / Wallet Card */}
          <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xl shadow-emerald-600/20 p-6">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-100/80">Available Payout</p>
                <h3 className="text-sm font-semibold text-white/90">M-Pesa / Bank Wallet</h3>
              </div>
              <Link
                href="/vendor/earnings"
                className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all"
                title="View Finance"
              >
                <ArrowUpRight className="h-4 w-4 text-white" />
              </Link>
            </div>

            {/* Chip & Brand */}
            <div className="my-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-10 rounded-md bg-amber-400/80 flex items-center justify-center shadow-inner">
                  <CreditCard className="h-4 w-4 text-emerald-950" />
                </div>
                <Wifi className="h-4 w-4 text-emerald-200 rotate-90" />
              </div>
              <span className="font-extrabold tracking-widest text-xs uppercase text-emerald-200">
                ZilaPay
              </span>
            </div>

            {/* Balance Amount */}
            <div>
              <p className="text-xs text-emerald-100/80 mb-0.5">Disbursable Balance</p>
              {isLoading ? (
                <Skeleton className="h-9 w-44 bg-white/20" />
              ) : (
                <p className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {formatKsh(data?.currentBalance || 0)}
                </p>
              )}
            </div>

            {/* Bottom Card Footer */}
            <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100/90 font-mono">
              <span>•••• {currentUser?.uid?.slice(-6) || '809090'}</span>
              <span>Next Payout: Fri</span>
            </div>
          </Card>

          {/* Card B: Weekly Revenue Pill Card */}
          <Card className="rounded-3xl bg-card/75 backdrop-blur-xl border border-border/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Weekly Net Revenue</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="text-2xl font-bold tracking-tight mt-0.5">
                    {formatKsh((data?.currentBalance || 15000) * 0.4)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+12.8%</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Center Column (5 cols on lg): Velocity Bar Chart */}
        <div className="lg:col-span-5">
          <Card className="h-full rounded-3xl bg-card/75 backdrop-blur-xl border border-border/80 p-6 flex flex-col justify-between shadow-sm">
            {/* Header with pill toggles */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-card border border-border/80 flex items-center justify-center text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Store Velocity</h3>
                  <p className="text-[11px] text-muted-foreground">Monthly sales performance</p>
                </div>
              </div>

              {/* Monthly / Annually Pill Toggle */}
              <div className="flex items-center bg-background/60 p-0.5 rounded-xl border border-border/60 text-xs">
                <button
                  onClick={() => setChartPeriod('monthly')}
                  className={cn(
                    "px-3 py-1 rounded-lg font-medium transition-all",
                    chartPeriod === 'monthly'
                      ? "bg-emerald-500 text-white shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setChartPeriod('annually')}
                  className={cn(
                    "px-3 py-1 rounded-lg font-medium transition-all",
                    chartPeriod === 'annually'
                      ? "bg-emerald-500 text-white shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Annually
                </button>
              </div>
            </div>

            {/* Peak Callout Badge */}
            <div className="flex items-center gap-1.5 mb-2 self-center">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                Peak: +17.8% in Apr
              </span>
            </div>

            {/* Capsule Bar Chart */}
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-2xl bg-card/95 border border-border/80 px-3 py-2 shadow-xl text-xs backdrop-blur-md">
                            <p className="font-semibold text-emerald-400">
                              {payload[0].payload.name}: KSh {Number(payload[0].value).toLocaleString()}
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              {payload[0].payload.orders} orders fulfilled
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    radius={[20, 20, 20, 20]}
                    barSize={28}
                    shape={(props: any) => {
                      const { x, y, width, height, index } = props;
                      const isPeak = index === peakIndex;
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          rx={14}
                          ry={14}
                          fill={isPeak ? '#10b981' : 'rgba(16, 185, 129, 0.35)'}
                          stroke={isPeak ? '#059669' : 'rgba(16, 185, 129, 0.5)'}
                          strokeWidth={1}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>Avg Conversion: 4.8%</span>
              <Link href="/vendor/analytics" className="text-emerald-400 hover:underline flex items-center gap-0.5">
                Full analytics <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Right Column (3 cols on lg): Total Balance Sparkline & CTAs */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="rounded-3xl bg-card/75 backdrop-blur-xl border border-border/80 p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Lifetime Sales</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-28 mt-1" />
                ) : (
                  <p className="text-xl font-bold tracking-tight mt-0.5">
                    {formatKsh(data?.totalAllTimeEarnings || 0)}
                  </p>
                )}
              </div>
              <Link href="/vendor/earnings" className="text-muted-foreground hover:text-foreground">
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Smooth Sparkline Area */}
            <div className="h-[90px] w-full my-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#sparklineGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Action Pill Buttons matching inspiration (Send / Receive) */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
              <Link href="/vendor/earnings">
                <Button variant="outline" className="w-full h-9 rounded-2xl border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs font-semibold gap-1">
                  <Send className="h-3 w-3" />
                  <span>Withdraw</span>
                </Button>
              </Link>
              <Link href="/vendor/reports">
                <Button variant="ghost" className="w-full h-9 rounded-2xl hover:bg-card text-xs font-medium gap-1 text-muted-foreground hover:text-foreground">
                  <Download className="h-3 w-3" />
                  <span>Statement</span>
                </Button>
              </Link>
            </div>
          </Card>

          {/* Mini Metric: Total Orders Fulfilled */}
          <Card className="rounded-3xl bg-card/75 backdrop-blur-xl border border-border/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Orders Processed</p>
                <p className="text-xl font-bold tracking-tight mt-0.5">
                  {data?.totalOrders || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Bottom Bento Grid: Recent Orders / Transactions & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left (8 cols): Payment / Order History matching table */}
        <div className="lg:col-span-8">
          <Card className="rounded-3xl bg-card/75 backdrop-blur-xl border border-border/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-base">Recent Orders & Payouts</h3>
                <p className="text-xs text-muted-foreground">Live transaction feed across your catalog</p>
              </div>
              <Link
                href="/vendor/orders/all"
                className="text-xs font-medium text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Interactive Data Table with rounded rows */}
            <div className="space-y-2.5">
              {data?.recentOrders && data.recentOrders.length > 0 ? (
                data.recentOrders.slice(0, 5).map((order: any) => {
                  const isDelivered = order.status === 'delivered';
                  const isProcessing = order.status === 'processing';

                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-card/50 hover:bg-card border border-border/60 hover:border-emerald-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold leading-snug">
                            Order #{order.id.slice(0, 8)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {order.items?.length || 1} items • {order.customerName || 'Customer'}
                          </p>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="hidden sm:block text-right">
                        <p className="text-xs font-medium">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Today'}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:30 PM'}
                        </p>
                      </div>

                      {/* Status indicator dot */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            isDelivered ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : isProcessing ? "bg-amber-400" : "bg-cyan-400"
                          )}
                        />
                        <span className="text-xs capitalize text-muted-foreground font-medium">
                          {order.status || 'Pending'}
                        </span>
                      </div>

                      {/* Total Amount */}
                      <div className="text-right">
                        <span className="text-xs md:text-sm font-bold text-foreground">
                          {formatKsh(order.totalAmount || order.total || 0)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  No orders placed yet. As customers buy your products, they will appear here.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right (4 cols): Pending Actions & Customer Relations */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="rounded-3xl bg-card/75 backdrop-blur-xl border border-border/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Action Items</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Live
              </span>
            </div>

            <div className="space-y-3">
              <Link
                href="/vendor/orders/incoming"
                className="flex items-center justify-between p-3 rounded-2xl bg-card/40 hover:bg-card border border-border/50 hover:border-border transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Incoming Orders</p>
                    <p className="text-[10px] text-muted-foreground">Pending dispatch verification</p>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href="/vendor/inventory"
                className="flex items-center justify-between p-3 rounded-2xl bg-card/40 hover:bg-card border border-border/50 hover:border-border transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Stock Reorder</p>
                    <p className="text-[10px] text-muted-foreground">Manage low-stock alerts</p>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href="/vendor/messaging"
                className="flex items-center justify-between p-3 rounded-2xl bg-card/40 hover:bg-card border border-border/50 hover:border-border transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Buyer Inquiries</p>
                    <p className="text-[10px] text-muted-foreground">Respond to customer messages</p>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
