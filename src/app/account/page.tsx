'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  Package, 
  Edit3, 
  Heart, 
  MapPin, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Bell
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Order, WishlistItemClient, Address } from '@/lib/types';

const getStatusBadge = (status: string) => {
  const norm = (status || '').toLowerCase();
  switch (norm) {
    case 'delivered':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Delivered</Badge>;
    case 'shipped':
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Shipped</Badge>;
    case 'processing':
    case 'pending':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 capitalize">{norm}</Badge>;
    case 'cancelled':
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Cancelled</Badge>;
    default:
      return <Badge variant="outline" className="capitalize">{norm || 'Unknown'}</Badge>;
  }
};

export default function AccountDashboardPage() {
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, wishlistItems: 0, savedAddresses: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch all customer summary data in parallel
      const [ordersRes, wishlistRes, addressesRes] = await Promise.all([
        fetch('/api/orders', { headers }),
        fetch('/api/users/me/wishlist', { headers }),
        fetch('/api/users/me/addresses', { headers }),
      ]);

      if (!ordersRes.ok) throw new Error('Failed to fetch orders');
      if (!wishlistRes.ok) throw new Error('Failed to fetch wishlist');
      if (!addressesRes.ok) throw new Error('Failed to fetch addresses');

      const ordersData: Order[] = await ordersRes.json();
      const wishlistData: WishlistItemClient[] = await wishlistRes.json();
      const addressesData: Address[] = await addressesRes.json();

      setRecentOrders(ordersData.slice(0, 3));
      setStats({
        totalOrders: ordersData.length,
        wishlistItems: wishlistData.length,
        savedAddresses: addressesData.length,
      });

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      const errorMessage = err instanceof Error ? err.message : 'Could not load dashboard data.';
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <Card className="bg-destructive/15 border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Error loading overview
            </CardTitle>
            <CardDescription className="text-destructive-foreground/80">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchData} variant="secondary" size="sm">Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* WELCOME BANNER & STATS */}
      <Card className="bg-card border-border shadow-md overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-headline text-glow-primary">
                Welcome back, {userProfile?.fullName || currentUser?.displayName || 'Shopper'}!
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Manage your orders, saved addresses, wishlist items, and personal settings.
              </CardDescription>
            </div>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shrink-0">
              <Link href="/products" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                <span>Explore Catalog</span>
              </Link>
            </Button>
          </div>
        </CardHeader>
        
        {/* INTERACTIVE METRIC TILES */}
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <Link 
            href="/account/orders" 
            className="group p-5 bg-card hover:bg-primary/5 border border-border/80 hover:border-primary/50 rounded-xl transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Total Orders
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-3xl font-bold font-headline mt-4 text-foreground">{stats.totalOrders}</p>
          </Link>

          <Link 
            href="/account/wishlist" 
            className="group p-5 bg-card hover:bg-accent/5 border border-border/80 hover:border-accent/50 rounded-xl transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Heart className="h-4 w-4 text-accent" /> Wishlist Items
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-3xl font-bold font-headline mt-4 text-foreground">{stats.wishlistItems}</p>
          </Link>

          <Link 
            href="/account/addresses" 
            className="group p-5 bg-card hover:bg-muted/70 border border-border/80 hover:border-foreground/30 rounded-xl transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-foreground" /> Saved Addresses
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-3xl font-bold font-headline mt-4 text-foreground">{stats.savedAddresses}</p>
          </Link>
        </CardContent>
      </Card>

      {/* RECENT ORDERS */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-xl font-headline text-glow-accent">Recent Orders</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Recent transactions and their fulfillment progress</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="hover:text-primary">
            <Link href="/account/orders" className="flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {recentOrders.map(order => (
                <li key={order.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-muted rounded-lg shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Link 
                        href={`/account/orders/${order.id}`} 
                        className="font-semibold text-foreground hover:text-primary hover:underline transition-colors flex items-center gap-1 text-sm sm:text-base"
                      >
                        <span>Order #{order.id?.substring(0, 8).toUpperCase()}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.items?.length ?? 0} item(s) &bull; Placed on {
                          typeof order.createdAt === 'object' && order.createdAt !== null && 'toDate' in order.createdAt
                            ? (order.createdAt as { toDate: () => Date }).toDate().toLocaleDateString()
                            : new Date(order.createdAt as string | number | Date).toLocaleDateString()
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="font-semibold text-sm sm:text-base">KSh {order.totalAmount.toLocaleString()}</span>
                    {getStatusBadge(order.status)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10 px-4 border border-dashed border-border/60 rounded-lg">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-foreground">No recent orders yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Once you place an order on ZilaCart, real-time tracking and invoice receipts will appear here.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <Link href="/products">Start Shopping</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ACCOUNT DETAILS & SECURITY PREFERENCES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-headline text-glow-accent">Account Profile</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Your primary contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Full Name</span>
              <span className="font-medium text-foreground">{userProfile?.fullName || currentUser?.displayName || 'Not specified'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Email Address</span>
              <span className="font-medium text-foreground truncate max-w-[200px]">{userProfile?.email || currentUser?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Account Status</span>
              <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10">Active Customer</Badge>
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" asChild className="w-full hover:border-primary">
                <Link href="/account/profile" className="flex items-center justify-center gap-2">
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Update Profile</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-headline text-glow-accent">Security & Notifications</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Keep your account secure and up to date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border/50">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Password & Login</span>
              </div>
              <Button variant="ghost" size="sm" asChild className="hover:text-primary">
                <Link href="/account/change-password">Change</Link>
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border/50">
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Push Notifications</span>
              </div>
              <Button variant="ghost" size="sm" asChild className="hover:text-accent">
                <Link href="/account/notifications">Configure</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
