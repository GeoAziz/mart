'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Package, Eye, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { Order as OrderType } from '@/lib/types';


const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'delivered':
      return 'bg-green-500/20 text-green-300 border-green-400';
    case 'processing':
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
    case 'shipped':
      return 'bg-blue-500/20 text-blue-300 border-blue-400';
    case 'cancelled':
      return 'bg-red-500/20 text-red-300 border-red-400';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const fetchOrders = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch orders');
      }
      const data: OrderType[] = await response.json();
      setOrders(data.map(o => ({...o, createdAt: new Date(o.createdAt)})));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not load order history.");
      toast({ title: 'Error', description: err instanceof Error ? err.message : "Could not load order history.", variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading your orders...</p>
      </div>
    );
  }

  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-glow-primary">My Orders</CardTitle>
        <CardDescription className="text-muted-foreground">View your order history and track current orders.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
            <div className="text-center py-12 text-destructive">
                <AlertCircle className="mx-auto h-12 w-12 mb-4"/>
                <p className="text-xl font-semibold">Error Loading Orders</p>
                <p>{error}</p>
                <Button onClick={fetchOrders} className="mt-4">Retry</Button>
            </div>
        )}
        {!isLoading && !error && orders.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total (KSh)</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/account/orders/${order.id}`} className="hover:text-primary hover:underline">
                      #{order.id?.substring(0, 7)}...
                    </Link>
                  </TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-center">{order.items.length}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild className="text-primary hover:bg-primary/10">
                      <Link href={`/account/orders/${order.id}`}>
                        <Eye className="mr-1 h-4 w-4" /> View Details
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          !isLoading && !error && (
            <EmptyState
              icon={Package}
              title="No orders yet"
              description="When you place orders, they'll appear here"
              action={{
                label: "Start Shopping",
                onClick: () => router.push('/products'),
              }}
            />
          )
        )}
      </CardContent>
    </Card>
  );
}
