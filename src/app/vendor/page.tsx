'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Star, Package, Loader2 } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { QuickActionsPanel } from '@/components/vendor/QuickActionsPanel';
import { StatCardWithTrend } from '@/components/vendor/StatCardWithTrend';
import { RecentActivityFeed } from '@/components/vendor/RecentActivityFeed';
import { ErrorState } from '@/components/states/ErrorState';
import { EmptyState } from '@/components/states/EmptyState';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

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

  const { data, isLoading, error } = dashboardState;

  // Mock activity feed data (replace with real data from API)
  const mockActivities = data ? [
    { id: '1', type: 'order' as const, title: 'New Order Received', description: 'Order #12345 - KSh 2,500', timestamp: new Date(), status: 'pending' as const },
    { id: '2', type: 'product' as const, title: 'Product Updated', description: 'Updated inventory for "Product Name"', timestamp: new Date(Date.now() - 3600000), status: 'success' as const },
    { id: '3', type: 'payment' as const, title: 'Payment Processed', description: 'Payout of KSh 15,000 completed', timestamp: new Date(Date.now() - 7200000), status: 'success' as const },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : error ? (
          <div className="col-span-full">
            <ErrorState 
              error={error} 
              onRetry={() => window.location.reload()} 
            />
          </div>
        ) : (
          <>
            <StatCardWithTrend
              title="Total Earnings"
              value={formatCurrency(data?.totalAllTimeEarnings)}
              icon={Star}
              trend={12}
            />
            <StatCardWithTrend
              title="Current Balance"
              value={formatCurrency(data?.currentBalance)}
              icon={Package}
              trend={-5}
            />
            <StatCardWithTrend
              title="Recent Orders"
              value={data?.totalOrders?.toString() || '0'}
              icon={Package}
              trend={8}
            />
            <StatCardWithTrend
              title="New Reviews"
              value={data?.totalReviews?.toString() || '0'}
              icon={Star}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      {!isLoading && !error && <QuickActionsPanel />}

      {/* Tabbed Charts Section */}
      {!isLoading && !error && (
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Sales Trend</TabsTrigger>
            <TabsTrigger value="products">Top Products</TabsTrigger>
            <TabsTrigger value="customers">Customer Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Overview</CardTitle>
                <CardDescription>Your earnings for the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.earningsChartData ? (
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
                  <EmptyState
                    icon={Package}
                    title="No earnings data"
                    description="Start selling to see your earnings chart"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Your best-selling products</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={Package}
                  title="Coming Soon"
                  description="Top products analytics will be available here"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
                <CardDescription>Learn about your customers</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={Package}
                  title="Coming Soon"
                  description="Customer insights will be available here"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Recent Activity & Recent Reviews Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity Feed */}
          <RecentActivityFeed activities={mockActivities} />

          {/* Recent Reviews */}
          <Card>
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
              {data?.recentReviews && data.recentReviews.length > 0 ? (
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
                <EmptyState
                  icon={Star}
                  title="No reviews yet"
                  description="Customer reviews will appear here"
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default VendorDashboardPage;
