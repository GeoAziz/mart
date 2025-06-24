
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, Home, CreditCard, Truck, FileText, ShoppingBag, MoreHorizontal, Edit, Send, PackageCheck, PackageX, Loader2, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Order, OrderItem, ShippingAddress } from '@/lib/types';

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
        return <ShoppingBag className="h-4 w-4 text-yellow-400" />;
      case 'processing':
        return <Edit className="h-4 w-4 text-yellow-400" />;
      case 'shipped':
        return <Send className="h-4 w-4 text-blue-400" />;
      case 'delivered':
        return <PackageCheck className="h-4 w-4 text-green-400" />;
      case 'cancelled':
      case 'refunded':
        return <PackageX className="h-4 w-4 text-red-400" />;
      default:
        return <ShoppingBag className="h-4 w-4 text-muted-foreground" />;
    }
}


export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  const fetchOrderDetails = useCallback(async () => {
    if (!currentUser || !orderId || userProfile?.role !== 'admin') {
        setIsLoading(false);
        setError(userProfile?.role !== 'admin' ? "Unauthorized access." : "Order ID or user information missing.");
        if(userProfile?.role !== 'admin' && currentUser) router.push('/auth/login'); // Redirect if not admin
        else if (!currentUser) router.push('/auth/login');
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch order ${orderId}`);
      }
      const data: Order = await response.json();
      setOrder({...data, createdAt: new Date(data.createdAt), updatedAt: new Date(data.updatedAt)});
    } catch (err) {
      console.error("Error fetching order details:", err);
      setError(err instanceof Error ? err.message : "Could not load order details.");
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, orderId, userProfile, router]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);
  
  const handleUpdateStatus = async (newStatus: Order['status']) => {
    if (!currentUser || !orderId || !order) return;
    setActionLoading(true);
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
      const updatedOrderData: Order = await response.json();
      setOrder({...updatedOrderData, createdAt: new Date(updatedOrderData.createdAt), updatedAt: new Date(updatedOrderData.updatedAt)});
      toast({ title: 'Success', description: `Order status updated to ${newStatus}.` });
    } catch (error) {
      console.error(`Error updating order ${orderId}:`, error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Could not update order status.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (error) {
     return (
      <Card className="m-auto mt-10 max-w-lg bg-card border-destructive shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-destructive">Error Loading Order</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <Button asChild className="mt-4">
            <Link href="/admin/orders"><ArrowLeft className="mr-2 h-4 w-4" /> Back to All Orders</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!order) {
     return (
      <Card className="m-auto mt-10 max-w-lg bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-glow-primary">Order Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The requested order could not be found.</p>
           <Button asChild className="mt-4">
            <Link href="/admin/orders"><ArrowLeft className="mr-2 h-4 w-4" /> Back to All Orders</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <Link href="/admin/orders">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Orders
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" disabled={actionLoading}>
               {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit className="mr-2 h-4 w-4" />}
                Update Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-primary shadow-lg">
              {['pending', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status) && order.status !== 'processing' && (
                <DropdownMenuItem onClick={() => handleUpdateStatus('processing')} className="hover:bg-yellow-500/10 hover:text-yellow-300 cursor-pointer">
                  <Edit className="mr-2 h-4 w-4" /> Mark as Processing
                </DropdownMenuItem>
              )}
              {['pending', 'processing', 'delivered', 'cancelled', 'refunded'].includes(order.status) && order.status !== 'shipped' && (
                <DropdownMenuItem onClick={() => handleUpdateStatus('shipped')} className="hover:bg-blue-500/10 hover:text-blue-300 cursor-pointer">
                  <Send className="mr-2 h-4 w-4" /> Mark as Shipped
                </DropdownMenuItem>
              )}
               {['pending', 'processing', 'shipped', 'cancelled', 'refunded'].includes(order.status) && order.status !== 'delivered' && (
                <DropdownMenuItem onClick={() => handleUpdateStatus('delivered')} className="hover:bg-green-500/10 hover:text-green-300 cursor-pointer">
                  <PackageCheck className="mr-2 h-4 w-4" /> Mark as Delivered
                </DropdownMenuItem>
              )}
               {order.status !== 'cancelled' && (
                 <DropdownMenuItem onClick={() => handleUpdateStatus('cancelled')} className="text-destructive hover:bg-destructive/10 hover:!text-destructive focus:bg-destructive/20 focus:!text-destructive cursor-pointer">
                  <PackageX className="mr-2 h-4 w-4" /> Cancel Order
                </DropdownMenuItem>
               )}
                {order.status !== 'refunded' && ['cancelled', 'delivered'].includes(order.status) && ( // Example: allow refund for cancelled or delivered
                 <DropdownMenuItem onClick={() => handleUpdateStatus('refunded')} className="text-destructive hover:bg-destructive/10 hover:!text-destructive focus:bg-destructive/20 focus:!text-destructive cursor-pointer">
                  <PackageX className="mr-2 h-4 w-4" /> Mark as Refunded
                </DropdownMenuItem>
               )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="bg-card border-border shadow-xl glow-edge-primary">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-2xl font-headline text-glow-primary">Order #{order.id?.substring(0,7)}...</CardTitle>
              <CardDescription className="text-muted-foreground">
                Placed on: {new Date(order.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge variant="outline" className={`text-lg px-4 py-1.5 ${getStatusBadgeVariant(order.status)}`}>
              {getStatusIcon(order.status)}
              <span className="ml-1.5">{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-glow-accent flex items-center">
                  <UserIcon className="mr-2 h-5 w-5 text-accent" /> Customer Information
              </h3>
              <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md border border-border/50">
                  <p><strong className="text-foreground">Name:</strong> {order.userFullName || 'N/A'}</p>
                  <p><strong className="text-foreground">Email:</strong> {order.userEmail || 'N/A'}</p>
                  <p><strong className="text-foreground">User ID:</strong> <Link href={`/admin/users?userId=${order.userId}`} className="text-primary hover:underline">{order.userId}</Link></p>
              </div>
          </div>

          <Separator className="my-6 border-border/50" />

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-glow-accent flex items-center">
              <Package className="mr-2 h-5 w-5 text-accent" /> Items Ordered ({order.items.length})
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] hidden sm:table-cell"></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="hidden sm:table-cell">
                      <Image src={item.imageUrl || 'https://placehold.co/64x64/cccccc/E0E0E0?text=NoImg'} alt={item.name} width={64} height={64} className="rounded-md object-cover border border-border" data-ai-hint={item.dataAiHint || "product"}/>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Product ID: {item.productId.substring(0,7)}...</p>
                    </TableCell>
                     <TableCell>
                      {item.vendorId ? (
                        <Link href={`/admin/users?userId=${item.vendorId}`} className="text-primary hover:underline text-xs">
                          {item.vendorId.substring(0, 7)}...
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">ZilaCart</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">KSh {item.price.toLocaleString()}</TableCell>
                    <TableCell className="text-right">KSh {(item.price * item.quantity).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator className="my-6 border-border/50" />

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-glow-accent flex items-center">
                <Home className="mr-2 h-5 w-5 text-accent" /> Shipping Address
              </h3>
              <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md border border-border/50">
                <p className="font-medium text-foreground">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.address}</p>
                <p>{order.shippingAddress.city}{order.shippingAddress.postalCode ? `, ${order.shippingAddress.postalCode}` : ''}</p>
                <p>Phone: {order.shippingAddress.phone}</p>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-glow-accent flex items-center">
                <CreditCard className="mr-2 h-5 w-5 text-accent" /> Payment Information
              </h3>
              <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md border border-border/50">
                <p><strong className="text-foreground">Method:</strong> {order.paymentMethod}</p>
                <p><strong className="text-foreground">Status:</strong> <span className={['processing', 'shipped', 'delivered'].includes(order.status) ? 'text-green-400' : 'text-yellow-400'}>
                  {order.status === 'pending' && order.paymentMethod.toLowerCase().includes('delivery') ? 'To be paid on delivery' : 
                   order.status === 'pending' ? 'Awaiting Payment Confirmation' :
                   ['processing', 'shipped', 'delivered'].includes(order.status) ? 'Paid' : 
                   order.status === 'cancelled' ? 'Payment Cancelled/Not Processed' :
                   order.status === 'refunded' ? 'Payment Refunded' :
                   'Payment Status Unknown'}
                </span></p>
                {order.paymentDetails && <p className="text-xs text-muted-foreground">Details: {JSON.stringify(order.paymentDetails)}</p>}
              </div>
            </div>
          </div>
          
        </CardContent>
        <CardFooter className="p-6 bg-muted/30 border-t border-border/50 flex flex-col items-end gap-2">
            <p className="text-muted-foreground text-sm">Subtotal: KSh {order.subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-muted-foreground text-sm">Shipping: KSh {order.shippingCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-muted-foreground text-sm">Tax (16%): KSh {order.taxAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xl font-bold text-primary">Total: KSh {order.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </CardFooter>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
         <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground glow-edge-accent">
          <Link href={`/invoice/${order.id}`} target="_blank">
            <FileText className="mr-2 h-4 w-4" /> View Invoice
          </Link>
        </Button>
         { (order.status === 'delivered' || order.status === 'shipped' || order.status === 'processing') &&
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => toast({title: "Feature Coming Soon", description: "Refund processing will be available soon."})}>
                Initiate Refund Process
            </Button>
         }
      </div>
    </div>
  );
}
