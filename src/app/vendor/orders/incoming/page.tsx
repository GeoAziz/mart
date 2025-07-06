'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Edit, MoreHorizontal, ShoppingBag, Inbox, Send, PackageSearch, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types'; // Import the Order type

const INCOMING_STATUSES: Order['status'][] = ['pending', 'processing'];

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
    case 'processing':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
    case 'shipped':
      return 'bg-blue-500/20 text-blue-300 border-blue-400';
    case 'delivered':
      return 'bg-green-500/20 text-green-300 border-green-400';
    case 'cancelled':
    case 'refunded':
      return 'bg-red-500/20 text-red-300 border-red-400';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
};

const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Inbox className="h-4 w-4 text-yellow-400" />;
      case 'processing':
        return <Edit className="h-4 w-4 text-yellow-400" />;
      default: // Fallback for other statuses, though ideally not shown on this page
        return <ShoppingBag className="h-4 w-4 text-muted-foreground" />;
    }
}

export default function IncomingOrdersPage() {
  const [allVendorOrders, setAllVendorOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data: Order[] = await response.json();
      setAllVendorOrders(
        data.map(o => ({
          ...o,
          createdAt:
            o.createdAt && typeof (o.createdAt as { toDate?: unknown }).toDate === 'function'
              ? (o.createdAt as { toDate: () => Date }).toDate()
              : (o.createdAt instanceof Date
                  ? o.createdAt
                  : typeof o.createdAt === 'object' && typeof (o.createdAt as { toDate?: unknown }).toDate === 'function'
                    ? (o.createdAt as { toDate: () => Date }).toDate()
                    : new Date(o.createdAt as unknown as string | number)),
        }))
      );
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Could not load orders.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  const incomingOrders = useMemo(() => {
    return allVendorOrders.filter(order => INCOMING_STATUSES.includes(order.status));
  }, [allVendorOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    if (!currentUser || !orderId) return;
    setActionLoading(prev => ({...prev, [orderId]: true}));
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order status');
      }
      toast({ title: 'Success', description: `Order #${orderId.substring(0,7)} status updated to ${newStatus}.` });
      fetchOrders(); 
    } catch (error) {
      console.error(`Error updating order ${orderId}:`, error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Could not update order status.', variant: 'destructive' });
    } finally {
      setActionLoading(prev => ({...prev, [orderId]: false}));
    }
  };

  if (isLoading && allVendorOrders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading incoming orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
            <Inbox className="mr-3 h-6 w-6 text-primary" /> Incoming Orders
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage new orders that require your attention.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incomingOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total (KSh)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomingOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/vendor/orders/${order.id}`} className="hover:text-primary hover:underline">
                        #{order.id?.substring(0, 7)}...
                      </Link>
                    </TableCell>
                    <TableCell>{order.userFullName || 'N/A'}</TableCell>
                    <TableCell>
                      {(() => {
                        // Firestore Timestamp compatibility
                        let createdAtDate: Date;
                        if (
                          order.createdAt &&
                          typeof order.createdAt === 'object' &&
                          typeof (order.createdAt as { toDate?: unknown }).toDate === 'function'
                        ) {
                          createdAtDate = (order.createdAt as { toDate: () => Date }).toDate();
                        } else {
                          createdAtDate = new Date(order.createdAt as string | number | Date);
                        }
                        return createdAtDate.toLocaleDateString();
                      })()}
                    </TableCell>
                    <TableCell className="text-center">{order.items.length}</TableCell>
                    <TableCell className="text-right">{order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`flex items-center justify-center gap-1.5 ${getStatusBadgeVariant(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {actionLoading[order.id!] ? <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /> : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Order Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-primary shadow-lg">
                          <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                            <Link href={`/vendor/orders/${order.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                            </Link>
                          </DropdownMenuItem>
                          {order.status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id!, 'processing')} className="hover:bg-yellow-500/10 hover:text-yellow-300 cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" /> Mark as Processing
                            </DropdownMenuItem>
                          )}
                          {order.status === 'processing' && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id!, 'shipped')} className="hover:bg-blue-500/10 hover:text-blue-300 cursor-pointer">
                              <Send className="mr-2 h-4 w-4" /> Mark as Shipped
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">No incoming orders.</p>
              <p className="text-sm text-muted-foreground">All new orders requiring action have been processed or there are no new orders.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
