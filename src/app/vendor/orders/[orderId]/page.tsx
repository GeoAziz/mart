'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Order as OrderType, OrderItem as OrderItemType } from '@/lib/types';
import { Button } from '@/components/ui/button';

// Define OrderStatus type based on possible order statuses
import type { OrderStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CreditCard, Edit, FileText, Home, Loader2, MessageSquare, Package, PackageCheck, PackageX, Send, ShoppingBag } from 'lucide-react';

const getStatusBadgeVariant = (status: OrderStatus | undefined) => {
  if (!status) {
    return 'bg-muted/50 text-muted-foreground border-border';
  }
  
  switch (status) {
    case 'pending':
    case 'processing':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
    case 'shipped':
    case 'out_for_delivery':
      return 'bg-blue-500/20 text-blue-300 border-blue-400';
    case 'delivered':
      return 'bg-green-500/20 text-green-300 border-green-400';
    case 'cancelled':
    case 'refunded':
    case 'partially_refunded':
      return 'bg-red-500/20 text-red-300 border-red-400';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
};

const getStatusIcon = (status: OrderStatus | undefined) => {
    if (!status) {
      return <ShoppingBag className="h-4 w-4 text-muted-foreground" />;
    }

    switch (status) {
      case 'pending':
        return <ShoppingBag className="h-4 w-4 text-yellow-400" />;
      case 'processing':
        return <Edit className="h-4 w-4 text-yellow-400" />;
      case 'shipped':
      case 'out_for_delivery':
        return <Send className="h-4 w-4 text-blue-400" />;
      case 'delivered':
        return <PackageCheck className="h-4 w-4 text-green-400" />;
      case 'cancelled':
      case 'refunded':
      case 'partially_refunded':
        return <PackageX className="h-4 w-4 text-red-400" />;
      default:
        return <ShoppingBag className="h-4 w-4 text-muted-foreground" />;
    }
}


export default function VendorOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<OrderType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchOrderDetails = useCallback(async () => {
    if (!currentUser || !orderId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          toast({ title: 'Order Not Found', description: `Order #${orderId} could not be found.`, variant: 'destructive' });
        } else if (response.status === 403) {
           toast({ title: 'Access Denied', description: `You do not have permission to view order #${orderId}.`, variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: errorData.message || 'Failed to fetch order details.', variant: 'destructive' });
        }
        setOrder(null);
        return;
      }
      const data: OrderType = await response.json();
      // Handle Firestore Timestamp or Date/string
      const convertToDate = (value: any) =>
        value && typeof value === 'object' && typeof value.toDate === 'function'
          ? value.toDate()
          : new Date(value);
      setOrder({
        ...data,
        createdAt: convertToDate(data.createdAt),
        updatedAt: convertToDate(data.updatedAt),
      });
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Could not load order details.', variant: 'destructive' });
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, orderId, toast]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleUpdateStatus = async (newStatus: OrderType['status']) => {
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
      const updatedOrder: OrderType = await response.json();
      // Use the same convertToDate logic as in fetchOrderDetails
      const convertToDate = (value: any) =>
        value && typeof value === 'object' && typeof value.toDate === 'function'
          ? value.toDate()
          : new Date(value);
      setOrder({
        ...updatedOrder,
        createdAt: convertToDate(updatedOrder.createdAt),
        updatedAt: convertToDate(updatedOrder.updatedAt),
      }); // Update local state
      toast({ title: 'Success', description: `Order status updated to ${newStatus}.` });
    } catch (error) {
      console.error(`Error updating order ${orderId}:`, error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Could not update order status.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate vendor items and related data only when order exists
  const vendorItems = order?.items?.filter((item: OrderItemType) => item.vendorId === currentUser?.uid) || [];
  const otherVendorItemsCount = order?.items ? order.items.length - vendorItems.length : 0;
  const vendorSubtotal = vendorItems.reduce((sum: number, item: OrderItemType) => sum + item.price * item.quantity, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (!order || !currentUser) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-xl font-semibold text-muted-foreground">Order Not Found</p>
        <p className="text-sm text-muted-foreground">The order details could not be loaded or you don't have access.</p>
        <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/vendor/orders/all">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Orders
          </Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <Link href="/vendor/orders/all">
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
              {order.status === 'pending' && (
                <DropdownMenuItem onClick={() => handleUpdateStatus('processing')} className="hover:bg-yellow-500/10 hover:text-yellow-300 cursor-pointer">
                  <Edit className="mr-2 h-4 w-4" /> Mark as Processing
                </DropdownMenuItem>
              )}
              {order.status === 'processing' && (
                <DropdownMenuItem onClick={() => handleUpdateStatus('shipped')} className="hover:bg-blue-500/10 hover:text-blue-300 cursor-pointer">
                  <Send className="mr-2 h-4 w-4" /> Mark as Shipped
                </DropdownMenuItem>
              )}
               {order.status === 'shipped' && (
                <DropdownMenuItem onClick={() => handleUpdateStatus('delivered')} className="hover:bg-green-500/10 hover:text-green-300 cursor-pointer">
                  <PackageCheck className="mr-2 h-4 w-4" /> Mark as Delivered
                </DropdownMenuItem>
              )}
              {/* Add other status transitions as needed, e.g., Mark as Cancelled by Vendor */}
               {(order.status === 'pending' || order.status === 'processing') && (
                 <DropdownMenuItem onClick={() => handleUpdateStatus('cancelled')} className="text-destructive hover:bg-destructive/10 hover:!text-destructive focus:bg-destructive/20 focus:!text-destructive cursor-pointer">
                  <PackageX className="mr-2 h-4 w-4" /> Cancel Order
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
                Placed on: {(order.createdAt && 'toDate' in order.createdAt 
                  ? order.createdAt.toDate() 
                  : new Date(order.createdAt as any)
                ).toLocaleDateString()} by {order.userFullName || order.userEmail || 'Customer'}
              </CardDescription>
            </div>
            <Badge variant="outline" className={`text-lg px-4 py-1.5 ${getStatusBadgeVariant(order.status)}`}>
              {getStatusIcon(order.status)}
              <span className="ml-1.5">
                {order.status ? order.status.split('_').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ') : 'Unknown'}
              </span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-glow-accent flex items-center">
              <Package className="mr-2 h-5 w-5 text-accent" /> Items from Your Store ({vendorItems.length})
            </h3>
            {vendorItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] hidden sm:table-cell"></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorItems.map((item: OrderItemType) => (
                  <TableRow key={item.productId}>
                    <TableCell className="hidden sm:table-cell">
                      <Image src={item.imageUrl || 'https://placehold.co/64x64/cccccc/E0E0E0?text=NoImg'} alt={item.name} width={64} height={64} className="rounded-md object-cover border border-border" data-ai-hint={item.dataAiHint || "product"}/>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{item.name}</p>
                      {/* If products have public pages, Link to /products/item.productId */}
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">KSh {item.price.toLocaleString()}</TableCell>
                    <TableCell className="text-right">KSh {(item.price * item.quantity).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No items from your store in this order.</p>
            )}
            {otherVendorItemsCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                    Note: This order also contains {otherVendorItemsCount} item(s) from other vendors.
                </p>
            )}
          </div>

          <Separator className="my-6 border-border/50" />

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-glow-accent flex items-center">
                <Home className="mr-2 h-5 w-5 text-accent" /> Shipping Address
              </h3>
              <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md border border-border/50">
                {order.shippingAddress ? (
                  <>
                    <p className="font-medium text-foreground">{order.shippingAddress.fullName || 'No name provided'}</p>
                    <p>{order.shippingAddress.address || 'No address provided'}</p>
                    <p>{order.shippingAddress.city || 'No city provided'}{order.shippingAddress.postalCode ? `, ${order.shippingAddress.postalCode}` : ''}</p>
                    <p>Phone: {order.shippingAddress.phone || 'No phone provided'}</p>
                  </>
                ) : (
                  <p>No shipping address available</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-glow-accent flex items-center">
                <CreditCard className="mr-2 h-5 w-5 text-accent" /> Payment Information
              </h3>
              <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md border border-border/50">
                <p><strong className="text-foreground">Method:</strong> {order.paymentMethod}</p>
                {/* In a real app, payment status might be more detailed */}
                <p><strong className="text-foreground">Overall Order Status:</strong> <span className={['processing', 'shipped', 'delivered'].includes(order.status) ? 'text-green-400' : 'text-yellow-400'}>Confirmed</span></p>
              </div>
            </div>
          </div>
          
        </CardContent>
        <CardFooter className="p-6 bg-muted/30 border-t border-border/50 flex flex-col items-end gap-2">
            <p className="text-muted-foreground text-sm">Your items subtotal: KSh {(vendorSubtotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-muted-foreground text-sm">Overall Order Subtotal: KSh {(order.subtotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-muted-foreground text-sm">Overall Order Shipping: KSh {(order.shippingCost || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-muted-foreground text-sm">Overall Order Tax (16%): KSh {(order.taxAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xl font-bold text-primary">Overall Order Total: KSh {(order.totalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </CardFooter>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground glow-edge-accent">
            <Link href={`/messaging/new?recipientId=${order.userId}&contextId=${order.id}&contextType=order&contextName=${encodeURIComponent(`Order #${order.id?.substring(0,7)}...`)}&recipientName=${encodeURIComponent(order.userFullName || 'Customer')}`}>
                <MessageSquare className="mr-2 h-4 w-4" /> Contact Customer
            </Link>
        </Button>
         <Button variant="outline" className="border-muted text-muted-foreground hover:bg-muted hover:text-foreground">
          <FileText className="mr-2 h-4 w-4" /> Download Packing Slip (Your Items)
        </Button>
      </div>
    </div>
  );
}
