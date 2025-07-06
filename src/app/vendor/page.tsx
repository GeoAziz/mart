'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Star, DollarSign, ShoppingBag, Wallet, Loader2 } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

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

// Add status badge variant helper
function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'processing':
      return 'default';
    case 'shipped':
      return 'info';
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

// State type
interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
}

// Add API function to fetch data
async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch('/api/vendors/me/dashboard');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  return response.json();
}

const VendorDashboardPage = () => {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    data: null,
    isLoading: true,
    error: null
  });
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser) {
        setDashboardState(prev => ({...prev, isLoading: false}));
        return;
      }
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/vendors/me/dashboard', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to load dashboard data');
        }
        
        const data = await response.json();
        
        // Validate required data fields
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid dashboard data received');
        }
        
        setDashboardState({
          data,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error('Dashboard loading error:', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to load dashboard data';
          
        setDashboardState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
        
        toast({
          title: 'Error loading dashboard',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    };

    loadDashboardData();
  }, [currentUser, toast]);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return `KSh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const { data, isLoading } = dashboardState;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Earnings"
          value={formatCurrency(data?.totalAllTimeEarnings)}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Current Balance"
          value={formatCurrency(data?.currentBalance)}
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Recent Orders"
          value={data?.totalOrders?.toString() || '0'}
          icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <StatCard
          title="New Reviews"
          value={data?.totalReviews?.toString() || '0'}
          icon={<Star className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
      </div>

      {/* Charts and Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Chart */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle>Earnings Overview</CardTitle>
            <CardDescription>Your earnings for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : data?.earningsChartData ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.earningsChartData}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorEarnings)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                No earnings data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest orders from your store</CardDescription>
            </div>
            <Link href="/vendor/orders/all">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : data?.recentOrders && data.recentOrders.length > 0 ? (
              <div className="grid gap-4">
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Order #{order.id.slice(-6)}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(order.total)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'delivered' ? 'bg-green-500/20 text-green-300' :
                      order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {order.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                No recent orders
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card className="bg-card border-border shadow-lg lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Reviews</CardTitle>
              <CardDescription>Latest customer feedback</CardDescription>
            </div>
            <Link href="/vendor/reviews">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : data?.recentReviews && data.recentReviews.length > 0 ? (
              <div className="grid gap-4">
                {data.recentReviews.map((review) => (
                  <div key={review.id} className="flex items-start space-x-4">
                    <Avatar>
                      {review.customerAvatar ? (
                        <AvatarImage src={review.customerAvatar} alt={review.customerName} />
                      ) : (
                        <AvatarFallback>
                          {review.customerName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{review.customerName}</p>
                        <time className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </time>
                      </div>
                      <p className="text-sm">{review.comment}</p>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-[200px] text-muted-foreground">
                No recent reviews
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VendorDashboardPage;
