
'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, Home, CreditCard, Truck, FileText, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Order as OrderType, OrderItem } from '@/lib/types';


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


export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<OrderType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedRefundItem, setSelectedRefundItem] = useState<OrderItem | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!currentUser || !orderId) return;
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch order details.');
      }
      const data: OrderType = await response.json();
      setOrder(data);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Could not load order details.', variant: 'destructive' });
      router.push('/account/orders'); // Redirect if order not found or forbidden
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, orderId, toast, router]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleOpenRefundModal = (item: OrderItem) => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to request a refund.", variant: "destructive" });
      router.push('/auth/login?redirect=' + window.location.pathname);
      return;
    }
    setSelectedRefundItem(item);
    setRefundReason('');
    setIsRefundModalOpen(true);
  };

  const handleRefundSubmit = async () => {
    if (!currentUser || !selectedRefundItem || !order) {
      toast({ title: "Error", description: "Missing information to submit refund request.", variant: "destructive" });
      return;
    }
    if (refundReason.trim().length < 10) {
      toast({ title: "Reason Required", description: "Please provide a reason for your refund request (at least 10 characters).", variant: "destructive" });
      return;
    }

    setIsSubmittingRefund(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/refunds/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          productId: selectedRefundItem.productId,
          reason: refundReason.trim(),
        }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || "Failed to submit refund request.");
      }
      
      toast({ title: "Refund Request Submitted", description: `Your request for ${selectedRefundItem.name} is being processed.` });
      setIsRefundModalOpen(false);
      setSelectedRefundItem(null);
      fetchOrderDetails(); // Re-fetch order details to update UI
    } catch (err) {
      console.error("Error submitting refund request:", err);
      toast({ title: "Submission Failed", description: err instanceof Error ? err.message : "Could not submit your refund request.", variant: "destructive" });
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const isRefundEligible = (item: OrderItem) => {
    if (!order) return false;
    // An item is not eligible if a refund has already been requested or approved for it.
    if (item.refundStatus && item.refundStatus !== 'none') return false;
    // Only certain order statuses are eligible for refund requests.
    return ['delivered', 'shipped', 'processing'].includes(order.status);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-xl font-semibold text-muted-foreground">Order not found.</p>
        <p className="text-sm text-muted-foreground">The order ID you provided does not match any existing orders.</p>
        <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/account/orders">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
    <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-primary shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-glow-accent">Request Refund for: {selectedRefundItem?.name}</DialogTitle>
            <DialogDescription>
              Please provide a reason for your refund request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="refundReason" className="text-sm font-medium">Reason for Refund</Label>
              <Textarea
                id="refundReason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g., Item arrived damaged, Wrong item received..."
                rows={4}
                className="bg-input border-primary focus:ring-accent"
                disabled={isSubmittingRefund}
              />
              {refundReason.trim().length > 0 && refundReason.trim().length < 10 && (
                <p className="text-xs text-yellow-400 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>Reason should be at least 10 characters.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" disabled={isSubmittingRefund}>Cancel</Button></DialogClose>
            <Button onClick={handleRefundSubmit} disabled={isSubmittingRefund || refundReason.trim().length < 10} className="bg-primary hover:bg-primary/90">
              {isSubmittingRefund ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RotateCcw className="mr-2 h-4 w-4"/>}
              {isSubmittingRefund ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <Link href="/account/orders">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Orders
          </Link>
        </Button>
        <Link href={`/track-order?id=${order.id}`} className="text-sm text-accent hover:underline">
            Track this order
        </Link>
      </div>

      <Card className="bg-card border-border shadow-xl glow-edge-primary">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-2xl font-headline text-glow-primary">Order #{order.id}</CardTitle>
              <CardDescription className="text-muted-foreground">Order placed on: {new Date(order.createdAt).toLocaleDateString()}</CardDescription>
            </div>
            <Badge variant="outline" className={`text-lg px-4 py-1.5 ${getStatusBadgeVariant(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-glow-accent flex items-center">
              <Package className="mr-2 h-5 w-5 text-accent" /> Items Ordered ({order.items.length})
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] hidden sm:table-cell"></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="hidden sm:table-cell">
                      <Image src={item.imageUrl || ''} alt={item.name} width={64} height={64} className="rounded-md object-cover border border-border" data-ai-hint={item.dataAiHint} />
                    </TableCell>
                    <TableCell>
                      <Link href={`/products/${item.productId}`} className="font-medium hover:text-primary hover:underline">{item.name}</Link>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">KSh {item.price.toLocaleString()}</TableCell>
                    <TableCell className="text-right">KSh {(item.price * item.quantity).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                       {item.refundStatus === 'approved' ? (
                         <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-400">Refunded</Badge>
                       ) : item.refundStatus === 'requested' ? (
                         <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-400">Refund Pending</Badge>
                       ) : isRefundEligible(item) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleOpenRefundModal(item)}
                        >
                          <RotateCcw className="mr-1 h-4 w-4" /> Request Refund
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="border-muted text-muted-foreground"
                        >
                          Refund N/A
                        </Button>
                      )}
                    </TableCell>
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
                 <p><strong className="text-foreground">Status:</strong> <span className={['processing', 'shipped', 'delivered'].includes(order.status) ? 'text-green-400' : 'text-yellow-400'}>Paid</span></p>
              </div>
            </div>
          </div>
        
        </CardContent>
        <CardFooter className="p-6 bg-muted/30 border-t border-border/50 flex flex-col sm:flex-row justify-end items-center gap-4">
          <div className="text-right">
            <p className="text-muted-foreground text-sm">Subtotal: KSh {order.subtotal.toLocaleString()}</p>
             {order.discountAmount && <p className="text-muted-foreground text-sm">Discount ({order.promotionCode}): -KSh {order.discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>}
            <p className="text-muted-foreground text-sm">Shipping: KSh {order.shippingCost.toLocaleString()}</p>
            <p className="text-muted-foreground text-sm">Tax (16%): KSh {order.taxAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xl font-bold text-primary">Total: KSh {order.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
        </CardFooter>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
         <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground glow-edge-accent">
          <Link href={`/invoice/${order.id}`} target="_blank">
            <FileText className="mr-2 h-4 w-4" /> View Invoice
          </Link>
        </Button>
      </div>
    </div>
    </>
  );
}
