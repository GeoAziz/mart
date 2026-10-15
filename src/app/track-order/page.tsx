'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Package, Truck, CheckCircle, Circle, HelpCircle, FileText, Loader2, LogIn } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';

interface OrderStatusStep {
  status: string;
  label: string;
  date?: string;
  note?: string;
  current: boolean;
}

interface TrackedOrder {
  id: string;
  customerName?: string | null;
  estimatedDeliveryDate?: unknown;
  items?: Array<{
    productId?: string;
    name?: string;
    quantity?: number;
    imageUrl?: string;
    dataAiHint?: string;
  }>;
  status: string;
  statusHistory?: Array<{
    status: string;
    timestamp?: unknown;
    note?: string;
  }>;
  updatedAt?: unknown;
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;

  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value);
  } else if (typeof value === 'object') {
    const timestamp = value as { seconds?: unknown; _seconds?: unknown };
    const seconds = typeof timestamp.seconds === 'number'
      ? timestamp.seconds
      : typeof timestamp._seconds === 'number'
        ? timestamp._seconds
        : null;
    if (seconds === null) return undefined;
    date = new Date(seconds * 1000);
  } else {
    return undefined;
  }

  return Number.isNaN(date.getTime())
    ? undefined
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function statusIcon(status: string) {
  switch (status) {
    case 'delivered':
      return CheckCircle;
    case 'shipped':
    case 'out_for_delivery':
      return Truck;
    case 'processing':
    case 'confirmed':
      return Package;
    case 'pending':
    case 'payment_pending':
      return FileText;
    default:
      return Circle;
  }
}

function buildStatusHistory(order: TrackedOrder): OrderStatusStep[] {
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const steps = history
    .filter((entry) => entry && typeof entry.status === 'string')
    .map((entry) => ({
      status: entry.status,
      label: formatStatus(entry.status),
      date: formatDate(entry.timestamp),
      note: entry.note,
      current: false,
    }));

  const currentStatus = order.status || 'pending';
  const currentStep = [...steps].reverse().find((step) => step.status === currentStatus);
  if (currentStep) {
    currentStep.current = true;
  } else {
    steps.push({
      status: currentStatus,
      label: formatStatus(currentStatus),
      date: formatDate(order.updatedAt),
      note: undefined,
      current: true,
    });
  }

  return steps;
}

export default function OrderTrackingPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [orderId, setOrderId] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<TrackedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInRequired, setSignInRequired] = useState(false);
  const autoTrackedId = useRef<string | null>(null);

  const trackOrder = useCallback(async (requestedOrderId: string) => {
    const normalizedId = requestedOrderId.trim();
    if (!normalizedId) {
      setError('Please enter an order ID.');
      setSearchedOrder(null);
      return;
    }

    if (!currentUser) {
      setSignInRequired(true);
      setError('Sign in to securely view your order details.');
      setSearchedOrder(null);
      return;
    }

    setOrderId(normalizedId);
    setIsLoading(true);
    setError(null);
    setSignInRequired(false);
    setSearchedOrder(null);

    try {
      let token = await currentUser.getIdToken();
      let response = await fetch(`/api/orders/${encodeURIComponent(normalizedId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        token = await currentUser.getIdToken(true);
        response = await fetch(`/api/orders/${encodeURIComponent(normalizedId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) {
          setSignInRequired(true);
        }
        throw new Error(result?.message || 'Could not retrieve this order.');
      }

      setSearchedOrder(result as TrackedOrder);
    } catch (trackingError) {
      console.error('Order tracking request failed:', trackingError);
      setError(trackingError instanceof Error ? trackingError.message : 'Could not retrieve this order.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const queryOrderId = new URLSearchParams(window.location.search).get('id')?.trim();
    if (!queryOrderId) return;

    setOrderId(queryOrderId);
    if (authLoading || autoTrackedId.current === queryOrderId) return;
    autoTrackedId.current = queryOrderId;
    void trackOrder(queryOrderId);
  }, [authLoading, trackOrder]);

  const signInHref = `/auth/login?redirect=${encodeURIComponent(
    `/track-order${orderId ? `?id=${encodeURIComponent(orderId)}` : ''}`
  )}`;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-headline font-bold text-glow-primary">Track Your Order</h1>
        <p className="text-lg text-muted-foreground mt-2">Enter your order ID to see its latest status.</p>
      </div>

      <Card className="w-full max-w-md mx-auto mb-12 bg-card border-primary shadow-xl glow-edge-primary">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-glow-accent">Enter Order ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="orderId" className="mb-1 block">Order ID</Label>
            <Input
              id="orderId"
              type="text"
              placeholder="Enter the order ID from your confirmation"
              value={orderId}
              onChange={(event) => {
                setOrderId(event.target.value);
                setError(null);
                setSignInRequired(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isLoading) void trackOrder(orderId);
              }}
              className="bg-input border-primary focus:ring-accent"
              autoComplete="off"
            />
          </div>
          {error && (
            <Alert variant="destructive" className="bg-destructive/20 border-destructive/50">
              <HelpCircle className="h-4 w-4 !text-destructive-foreground" />
              <AlertTitle className="text-destructive-foreground">Unable to track order</AlertTitle>
              <AlertDescription className="text-destructive-foreground/80">
                {error}
                {signInRequired && (
                  <span className="mt-2 block">
                    <Link href={signInHref} className="inline-flex items-center font-medium underline">
                      <LogIn className="mr-1 h-4 w-4" /> Sign in to continue
                    </Link>
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => void trackOrder(orderId)} disabled={isLoading || authLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading || authLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {authLoading ? 'Checking sign-in...' : 'Loading order...'}
              </>
            ) : (
              'Track Order'
            )}
          </Button>
        </CardFooter>
      </Card>

      {searchedOrder && (
        <Card className="w-full max-w-3xl mx-auto bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-glow-primary">Order Details: {searchedOrder.id}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {searchedOrder.customerName ? `Hello ${searchedOrder.customerName}. ` : ''}
              Current status: {formatStatus(searchedOrder.status)}.
              {formatDate(searchedOrder.estimatedDeliveryDate)
                ? ` Estimated delivery: ${formatDate(searchedOrder.estimatedDeliveryDate)}.`
                : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3 text-glow-accent">Items in this Order</h2>
              {searchedOrder.items?.length ? (
                <div className="space-y-3">
                  {searchedOrder.items.map((item, index) => (
                    <div key={`${item.productId || item.name || 'item'}-${index}`} className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border border-border/50">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name || 'Product image'}
                          width={60}
                          height={60}
                          className="h-[60px] w-[60px] rounded object-cover"
                          data-ai-hint={item.dataAiHint}
                        />
                      ) : (
                        <div className="h-[60px] w-[60px] rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                          No image
                        </div>
                      )}
                      <div className="flex-grow">
                        <p className="text-sm font-medium text-foreground">{item.name || 'Product'}</p>
                        <p className="text-xs text-muted-foreground">Quantity: {item.quantity ?? 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No item details are available for this order.</p>
              )}
            </div>

            <Separator />

            <section aria-labelledby="order-status-heading">
              <h2 id="order-status-heading" className="text-lg font-semibold mb-4 text-glow-accent">
                Order status: <span className="text-primary">{formatStatus(searchedOrder.status)}</span>
              </h2>
              <ol className="relative space-y-6">
                {buildStatusHistory(searchedOrder).map((step, index, steps) => {
                  const Icon = statusIcon(step.status);
                  return (
                    <li key={`${step.status}-${index}`} className="flex items-start">
                      <div className="flex flex-col items-center mr-4" aria-hidden="true">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step.current ? 'border-primary bg-primary/20 text-primary' : 'border-muted-foreground text-muted-foreground'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`w-0.5 h-8 mt-1 ${step.current ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${step.current ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}{step.current ? ' (Current)' : ''}
                        </p>
                        {step.date && <p className="text-xs text-muted-foreground">{step.date}</p>}
                        {step.note && <p className="mt-1 text-sm text-muted-foreground">{step.note}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
