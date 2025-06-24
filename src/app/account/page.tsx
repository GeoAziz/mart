
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Package, Edit3, Heart, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Order, WishlistItemClient, Address } from '@/lib/types';


export default function AccountDashboardPage() {
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, wishlistItems: 0, savedAddresses: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

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

      // Fetch all data in parallel
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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       {error && (
            <Card className="bg-destructive/20 border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive-foreground flex items-center gap-2"><AlertCircle/> Error</CardTitle>
                    <CardDescription className="text-destructive-foreground/80">{error}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={fetchData} variant="secondary">Retry</Button>
                </CardContent>
            </Card>
        )}

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-glow-primary">Welcome back, {userProfile?.fullName || 'Valued Customer'}!</CardTitle>
          <CardDescription className="text-muted-foreground">
            Here's an overview of your account activity. Member since {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'a while'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-primary/10 border border-primary rounded-md">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2"><Package/>Total Orders</h3>
            <p className="text-2xl font-bold">{isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : stats.totalOrders}</p> 
          </div>
           <div className="p-4 bg-accent/10 border border-accent rounded-md">
            <h3 className="text-lg font-semibold text-accent flex items-center gap-2"><Heart/>Wishlist Items</h3>
            <p className="text-2xl font-bold">{isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : stats.wishlistItems}</p>
          </div>
           <div className="p-4 bg-muted border border-border rounded-md">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2"><MapPin/>Saved Addresses</h3>
            <p className="text-2xl font-bold">{isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : stats.savedAddresses}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-headline text-glow-accent">Recent Orders</CardTitle>
          <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <Link href="/account/orders">View All Orders</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <ul className="space-y-4">
              {recentOrders.map(order => (
                <li key={order.id} className="p-4 border border-border/50 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center">
                    <Package className="h-8 w-8 text-primary mr-4 hidden sm:block" />
                    <div>
                      <Link href={`/account/orders/${order.id}`} className="font-semibold text-foreground hover:text-primary hover:underline">Order #{order.id?.substring(0,7)}...</Link>
                      <p className="text-sm text-muted-foreground">Date: {new Date(order.createdAt).toLocaleDateString()} &bull; {order.items.length} item(s)</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start sm:items-end mt-2 sm:mt-0">
                    <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                      order.status === 'delivered' ? 'bg-green-500/20 text-green-300' : 
                      order.status === 'processing' || order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : 
                      'bg-blue-500/20 text-blue-300'
                    }`}>{order.status}</span>
                    <p className="font-medium mt-1">Total: KSh {order.totalAmount.toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-5">You have no recent orders.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-glow-accent">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            <p><strong className="text-muted-foreground">Name:</strong> {userProfile?.fullName || 'N/A'}</p>
            <p><strong className="text-muted-foreground">Email:</strong> {userProfile?.email || 'N/A'}</p>
            <Button variant="outline" asChild className="mt-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                <Link href="/account/profile"><Edit3 className="mr-2 h-4 w-4"/> Edit Profile</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
