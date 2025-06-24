
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, Printer, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';
import Logo from '@/components/layout/Logo';
import { Separator } from '@/components/ui/separator';

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchOrderDetails = useCallback(async () => {
    if (!currentUser || !orderId) {
      setError("Authentication or Order ID missing.");
      setIsLoading(false);
      return;
    }
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
      const data: Order = await response.json();
      setOrder(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not load order details.');
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Could not load order details.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, orderId, toast]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Card className="m-auto mt-10 max-w-lg bg-card border-destructive shadow-lg p-6">
          <CardHeader>
            <CardTitle className="text-xl text-destructive flex items-center"><AlertCircle className="mr-2"/>Error Loading Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || 'The requested invoice could not be found or you do not have permission to view it.'}</p>
            <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen p-4 sm:p-8 print-container">
        <div className="max-w-4xl mx-auto bg-card p-6 sm:p-10 rounded-lg shadow-2xl border border-border">
            <header className="flex justify-between items-start pb-6 border-b print-border">
                <div className="flex flex-col">
                    <Logo />
                    <p className="text-sm text-muted-foreground mt-2">Nairobi, Kenya</p>
                    <p className="text-sm text-muted-foreground">support@zilacart.com</p>
                </div>
                <div className="text-right">
                    <h1 className="text-3xl font-bold uppercase text-glow-primary print-text-primary">Invoice</h1>
                    <p className="text-muted-foreground">#{order.id}</p>
                    <p className="text-muted-foreground mt-2">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
            </header>

            <section className="grid sm:grid-cols-2 gap-6 my-6">
                <div>
                    <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Bill To</h2>
                    <p className="font-bold text-lg text-foreground">{order.shippingAddress.fullName}</p>
                    <p className="text-muted-foreground">{order.shippingAddress.address}</p>
                    <p className="text-muted-foreground">{order.shippingAddress.city}{order.shippingAddress.postalCode ? `, ${order.shippingAddress.postalCode}` : ''}</p>
                    <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
                </div>
                <div className="text-left sm:text-right">
                    <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Payment Details</h2>
                    <p className="text-foreground"><span className="font-semibold">Method:</span> {order.paymentMethod}</p>
                    <p className="text-foreground"><span className="font-semibold">Status:</span> Paid</p>
                </div>
            </section>

            <section>
                <Table className="print-bg-card">
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50 border-b print-border">
                            <TableHead className="w-[60%]">Item</TableHead>
                            <TableHead className="text-center">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {order.items.map((item) => (
                            <TableRow key={item.productId} className="border-b print-border">
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">KSh {item.price.toLocaleString()}</TableCell>
                                <TableCell className="text-right">KSh {(item.price * item.quantity).toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </section>

            <section className="flex justify-end mt-6">
                <div className="w-full max-w-sm space-y-2">
                    <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>KSh {order.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                     {order.discountAmount && (
                        <div className="flex justify-between text-muted-foreground">
                            <span>Discount ({order.promotionCode})</span>
                            <span>-KSh {order.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                        <span>Shipping</span>
                        <span>KSh {order.shippingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>Tax (VAT 16%)</span>
                        <span>KSh {order.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <Separator className="my-2 !bg-border print-border" />
                    <div className="flex justify-between font-bold text-lg text-primary print-text-primary">
                        <span>Total Due</span>
                        <span>KSh {order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </section>

            <footer className="mt-10 pt-6 border-t print-border text-center text-xs text-muted-foreground">
                <p>Thank you for your business with ZilaCart!</p>
                <p>If you have any questions about this invoice, please contact us at support@zilacart.com.</p>
            </footer>
        </div>

        <div className="max-w-4xl mx-auto mt-6 text-center no-print">
            <Button onClick={() => window.print()} className="bg-primary hover:bg-primary/90">
                <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
            </Button>
        </div>
    </div>
  );
}
